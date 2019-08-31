# This container must be run with the following command 
# docker run --rm --privileged --security-opt=apparmor:unconfined -ti spidermonkey
FROM debian

RUN mkdir -p /usr/workdir/
WORKDIR /usr/workdir/

# Codebase
RUN apt-get update && apt-get install -y git curl && git clone --depth 1 https://github.com/mozilla/gecko-dev.git
RUN curl -o blaze.path https://raw.githubusercontent.com/0vercl0k/blazefox/master/blaze.patch

# Mercurial
RUN apt-get install -y python python-dev build-essential && curl https://bootstrap.pypa.io/get-pip.py | python && pip install Mercurial
# Bootstrap - non-interactive
ADD nonInteractiveBootstrap.sh nonInteractiveBootstrap.sh
RUN curl -o bootstrap.py https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py && chmod +x nonInteractiveBootstrap.sh && apt-get install -y expect && ./nonInteractiveBootstrap.sh

# Build!
WORKDIR /usr/workdir/gecko-dev/js/src
ENV SHELL /bin/bash
RUN autoconf2.13 
RUN apt-get install -y clang
RUN mkdir build.assets && cd build.assets && ../configure --enable-debug --disable-optimize --with-libclang-path=/usr/lib/llvm-7/lib
RUN cd build.assets && make

# Debug
RUN apt-get install -y gdb wget
EXPOSE 4444
RUN echo set auto-load safe-path / > /root/.gdbinit
RUN wget -q -O- https://github.com/hugsy/gef/raw/master/scripts/gef.sh | sh
WORKDIR /usr/workdir/gecko-dev/js/src/build.assets/js/src
CMD gdb js 
#CMD gdbserver 0.0.0.0:4444 /usr/workdir/gecko-dev/js/src/build.assets/js/src/js