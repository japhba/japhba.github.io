---
# Homepage
type: widget_page

# Homepage is headless, other widget pages are not.
headless: true
---
{{ $faviconTemplate := resources.Get "../../assets/media/favicon-template.svg" -}}
{{ $favicon := $faviconTemplate | resources.Minify | resources.ExecuteAsTemplate "../../assets/media/favicon-template.svg" . -}}
<link rel=icon type=image/svg+xml href={{ $favicon.Permalink }}>
