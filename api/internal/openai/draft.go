package openai

import (
	"context"
	"fmt"
)

type BrandVoice struct {
	Tone            string   `json:"tone"`
	BusinessContext string   `json:"business_context"`
	Rules           string   `json:"rules"`
	Examples        []string `json:"examples"`
}

type DraftRequest struct {
	BusinessName string
	BusinessType string
	BrandVoice   BrandVoice
	ReviewerName string
	Rating       int
	ReviewText   string
	Instructions string
}

func (c *Client) DraftResponse(ctx context.Context, req DraftRequest) (string, error) {
	systemPrompt := fmt.Sprintf(`You are a review response assistant for %s, a %s.`, req.BusinessName, req.BusinessType)

	if req.BrandVoice.Tone != "" {
		systemPrompt += fmt.Sprintf("\nTone: %s", req.BrandVoice.Tone)
	}
	if req.BrandVoice.BusinessContext != "" {
		systemPrompt += fmt.Sprintf("\nContext: %s", req.BrandVoice.BusinessContext)
	}
	if req.BrandVoice.Rules != "" {
		systemPrompt += fmt.Sprintf("\nRules: %s", req.BrandVoice.Rules)
	}
	if len(req.BrandVoice.Examples) > 0 {
		systemPrompt += "\n\nExample responses they liked:"
		for i, ex := range req.BrandVoice.Examples {
			systemPrompt += fmt.Sprintf("\n%d. %s", i+1, ex)
		}
	}

	systemPrompt += "\n\nWrite a concise, genuine response. Don't be overly apologetic or use excessive exclamation marks. Match the tone specified above. Keep it under 100 words."

	userPrompt := fmt.Sprintf("Draft a response to this %d-star review from %s:\n\"%s\"", req.Rating, req.ReviewerName, req.ReviewText)
	if req.Instructions != "" {
		userPrompt += fmt.Sprintf("\n\nAdditional instructions: %s", req.Instructions)
	}

	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userPrompt},
	}

	return c.Complete(ctx, "gpt-4o", messages, 0.7, 300)
}
