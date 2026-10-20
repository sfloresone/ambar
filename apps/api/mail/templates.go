package mail

import (
	"bytes"
	"embed"
	"html/template"
	texttemplate "text/template"
)

//go:embed templates/sign-in.html templates/sign-in.txt
var signInTemplates embed.FS

var (
	signInHTMLTemplate = template.Must(template.ParseFS(signInTemplates, "templates/sign-in.html"))
	signInTextTemplate = texttemplate.Must(texttemplate.ParseFS(signInTemplates, "templates/sign-in.txt"))
)

type signInTemplateData struct {
	Code string
	Link string
}

func renderSignIn(code, link string) (htmlBody, textBody string, err error) {
	data := signInTemplateData{Code: code, Link: link}

	var htmlBuffer bytes.Buffer
	if err := signInHTMLTemplate.Execute(&htmlBuffer, data); err != nil {
		return "", "", err
	}

	var textBuffer bytes.Buffer
	if err := signInTextTemplate.Execute(&textBuffer, data); err != nil {
		return "", "", err
	}

	return htmlBuffer.String(), textBuffer.String(), nil
}
