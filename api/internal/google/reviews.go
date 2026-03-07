package google

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Review struct {
	Name        string       `json:"name"`
	ReviewID    string       `json:"reviewId"`
	Reviewer    Reviewer     `json:"reviewer"`
	StarRating  string       `json:"starRating"`
	Comment     string       `json:"comment"`
	CreateTime  string       `json:"createTime"`
	ReviewReply *ReviewReply `json:"reviewReply,omitempty"`
}

type Reviewer struct {
	DisplayName     string `json:"displayName"`
	ProfilePhotoUrl string `json:"profilePhotoUrl"`
}

type ReviewReply struct {
	Comment    string `json:"comment"`
	UpdateTime string `json:"updateTime"`
}

type reviewsResponse struct {
	Reviews       []Review `json:"reviews"`
	NextPageToken string   `json:"nextPageToken"`
}

func StarRatingToInt(rating string) int {
	switch rating {
	case "ONE":
		return 1
	case "TWO":
		return 2
	case "THREE":
		return 3
	case "FOUR":
		return 4
	case "FIVE":
		return 5
	default:
		return 0
	}
}

func (c *Client) ListReviews(ctx context.Context, accountName, locationID string, pageSize int, pageToken string) ([]Review, string, error) {
	url := fmt.Sprintf("https://mybusiness.googleapis.com/v4/%s/locations/%s/reviews?pageSize=%d", accountName, locationID, pageSize)
	if pageToken != "" {
		url += "&pageToken=" + pageToken
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, "", fmt.Errorf("creating request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("fetching reviews: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, "", fmt.Errorf("google reviews API returned %d: %s", resp.StatusCode, body)
	}

	var result reviewsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, "", fmt.Errorf("decoding reviews response: %w", err)
	}

	return result.Reviews, result.NextPageToken, nil
}

func (c *Client) ReplyToReview(ctx context.Context, reviewName string, comment string) error {
	url := fmt.Sprintf("https://mybusiness.googleapis.com/v4/%s/reply", reviewName)
	body, err := json.Marshal(map[string]string{"comment": comment})
	if err != nil {
		return fmt.Errorf("marshaling reply body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("posting reply: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("google reply API returned %d: %s", resp.StatusCode, respBody)
	}

	return nil
}
