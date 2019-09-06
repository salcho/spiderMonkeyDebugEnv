# A docker debug environment for SpiderMonkey

This repo builds a debug environment to develop and test exploits for SpiderMonkey. It defines a docker image based on Debian with all the dependencies needed to build and run a JavaScript shell. SpiderMonkey's source code should be dropped next to this repo's Docker file. Mozilla use Mercurial to do this but I prefer git:

`git clone --depth 1 https://github.com/mozilla/gecko-dev.git`

A custom patch file is provided to simulate the blazefox CTF challenge (https://ctftime.org/task/6000) that works with the commit where gecko-dev.git's HEAD used to point to when this repo was created. See **blazeCustom.patch** for more.

## GDB support

GDB comes installed by default with a copy of GEF (https://gef.readthedocs.io/en/master/). A few extra tools and references are provided to start poking SpiderMonkey's memory for objects and functions:

- Mozilla's own pretty printers are enabled by default (https://blog.mozilla.org/javascript/2013/01/03/support-for-debugging-spidermonkey-with-gdb-now-landed/)
- The file **customFunctions.py** provides a small utility to inspect arrays and JS::Value objects.

## Floating points and IEEE-754

A handful of useful references to get your head around NaN-boxing, etc.

- https://anniecherkaev.com/the-secret-life-of-nan
- http://sandbox.mc.edu/~bennet/cs110/flt/ftod.html
- saelo's int64 library, which I took from https://github.com/saelo/cve-2018-4233

Big integers are now supported in all major browsers and replacing int64.js is left as an exercise for the reader.
