package billing

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

// VerifyWebhookSignature verifies a Standard Webhooks signature.
// Headers: webhook-id, webhook-timestamp, webhook-signature
// Secret is base64-encoded with "whsec_" prefix.
func VerifyWebhookSignature(payload []byte, webhookID, webhookTimestamp, webhookSignature, secret string) error {
	if webhookID == "" || webhookTimestamp == "" || webhookSignature == "" {
		return fmt.Errorf("missing webhook headers")
	}

	ts, err := strconv.ParseInt(webhookTimestamp, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid timestamp")
	}
	if math.Abs(float64(time.Now().Unix()-ts)) > 300 {
		return fmt.Errorf("timestamp too old")
	}

	rawSecret := strings.TrimPrefix(secret, "whsec_")
	key, err := base64.StdEncoding.DecodeString(rawSecret)
	if err != nil {
		return fmt.Errorf("invalid webhook secret: %w", err)
	}

	signedContent := webhookID + "." + webhookTimestamp + "." + string(payload)
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(signedContent))
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	// webhook-signature header can contain multiple signatures: "v1,<sig1> v1,<sig2>"
	signatures := strings.Split(webhookSignature, " ")
	for _, sig := range signatures {
		parts := strings.SplitN(sig, ",", 2)
		if len(parts) != 2 || parts[0] != "v1" {
			continue
		}
		if hmac.Equal([]byte(parts[1]), []byte(expected)) {
			return nil
		}
	}
	return fmt.Errorf("signature mismatch")
}
