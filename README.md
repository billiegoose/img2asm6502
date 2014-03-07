Image -> 6502 Assembly Code
===========================

I was playing with (Easy 6502)[http://skilldrick.github.io/easy6502] and wanted a way to render images.
This code lets you drop an image onto the web page and spits out the assembly code to render that image.
Currently it always uses the entire screen area (32x32 pixels).

It uses Node as a http server because otherwise Chrome's Cross-Site Scripting protection gets in the way when trying to extract pixel data.