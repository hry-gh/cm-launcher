/client/New()
	. = ..()

	winset(src, null, "browser-options=devtools")

	src << browse(file2text("web/dist/output.html"), "window=browser")

	sleep(1)

	src << output(list2params(list(json_encode(list("ckey" = src.ckey)))), "browser:update")

/proc/send_to_client(client/who_to, to_send)
	who_to << output(list2params(list(json_encode(to_send))), "browser:update")

/client/verb/connect(url as text)
	usr << link(url)
