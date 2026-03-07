package email

import "fmt"

func NegativeReviewEmail(businessName, authorName, reviewText string, rating int, dashboardURL string) (subject, html string) {
	subject = fmt.Sprintf("Negative review alert: %d-star review for %s", rating, businessName)
	html = fmt.Sprintf(`
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
			<h2 style="color: #dc2626;">Negative Review Alert</h2>
			<p>A new %d-star review was posted for <strong>%s</strong>.</p>
			<div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
				<p style="margin: 0 0 8px 0;"><strong>%s</strong> wrote:</p>
				<p style="margin: 0; color: #374151;">"%s"</p>
			</div>
			<p>An AI response draft has been generated and is ready for your review.</p>
			<a href="%s" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 8px;">Review &amp; Respond</a>
		</div>
	`, rating, businessName, authorName, reviewText, dashboardURL)
	return
}
