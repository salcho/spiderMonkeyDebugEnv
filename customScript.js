a = new Array(1,2,3,4,5,6)
b = new Uint8Array(8)
objectAddress(a)
objectAddress(b)
a.blaze() == undefined
