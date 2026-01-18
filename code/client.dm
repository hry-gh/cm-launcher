/client
	control_freak = CONTROL_FREAK_ALL

/client/New()
	. = ..()

	src << browse(launcher, "window=browser")

/client/verb/ready()
	src << output(list2params(list(json_encode(list("ckey" = src.ckey)))), "browser:update")
