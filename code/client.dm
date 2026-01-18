/client/New()
	. = ..()

	winset(src, null, "browser-options=devtools")

	src << browse(file2text("web/dist/output.html"), "window=browser")
