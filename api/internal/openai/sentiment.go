package openai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

type SentimentResult struct {
	Score float64 `json:"score"`
	Label string  `json:"label"`
}

func (c *Client) AnalyzeSentiment(ctx context.Context, reviewText string, rating int) (*SentimentResult, error) {
	if reviewText == "" {
		label := "neutral"
		score := 0.0
		if rating >= 4 {
			label = "positive"
			score = 0.5
		}
		if rating <= 2 {
			label = "negative"
			score = -0.5
		}
		return &SentimentResult{Score: score, Label: label}, nil
	}

	messages := []ChatMessage{
		{Role: "system", Content: `Analyze the sentiment of this review. Return JSON only: {"score": <float from -1 to 1>, "label": "<positive|neutral|negative>"}`},
		{Role: "user", Content: fmt.Sprintf("Rating: %d/5\nReview: %s", rating, reviewText)},
	}

	result, err := c.Complete(ctx, "gpt-4o-mini", messages, 0, 100)
	if err != nil {
		return nil, err
	}

	result = strings.TrimSpace(result)
	result = strings.TrimPrefix(result, "```json")
	result = strings.TrimPrefix(result, "```")
	result = strings.TrimSuffix(result, "```")
	result = strings.TrimSpace(result)

	var sentiment SentimentResult
	if err := json.Unmarshal([]byte(result), &sentiment); err != nil {
		return nil, fmt.Errorf("failed to parse sentiment response: %w (raw: %s)", err, result)
	}

	return &sentiment, nil
}
