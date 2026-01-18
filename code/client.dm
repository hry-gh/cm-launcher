/client/New()
	. = ..()

	winset(src, null, "browser-options=devtools")

	src << browse(launcher, "window=browser")

	sleep(1)

/proc/send_to_client(client/who_to, to_send)
	who_to << output(list2params(list(json_encode(to_send))), "browser:update")

/client/verb/ready()
	src << output(list2params(list(json_encode(list("ckey" = src.ckey)))), "browser:update")
