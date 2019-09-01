class JSObjectInfo(gdb.Function):
    def __init__(self):
        super (JSObjectInfo, self).__init__ ("jsObjInfo")

    def invoke(self, obj):
        if str(obj.type) != 'JS::Value':
            return "[-] Not a JS::Value! Got a " + str(obj.type) + " instead"


        prefix = "(('JS::Value'*)%s)" % obj.address
        taggedPointer = int(gdb.parse_and_eval("%s.asBits_" % prefix))
        print("[*] Parsing JS::Value at     " + str(obj.address))
        print("[*] Tagged pointer is        " + hex(taggedPointer))
        tag = (((0xffff << 48) & taggedPointer) >> 47) & 0xf
        tagName = self.tag_to_name(tag)
        print("[*] Tag is                   " + tagName)
        print("[*] Payload is               " + hex(((2 ** 48) - 1) & taggedPointer))

        if tagName == 'object':
            className = gdb.parse_and_eval("(('JS::Value')*%s).toObject().groupRaw().clasp_.name" % obj.address).string()
            print("[*] Class name is            " + className)
            if className == 'Array':
                print("...Array...")


        return obj

    '''
    As per git commit 2e7e5f93bc63f7f1afacaab2423012f6d859cf6a
    enum JSValueType : uint8_t {
      JSVAL_TYPE_DOUBLE = 0x00,
      JSVAL_TYPE_INT32 = 0x01,
      JSVAL_TYPE_BOOLEAN = 0x02,
      JSVAL_TYPE_UNDEFINED = 0x03,
      JSVAL_TYPE_NULL = 0x04,
      JSVAL_TYPE_MAGIC = 0x05,
      JSVAL_TYPE_STRING = 0x06,
      JSVAL_TYPE_SYMBOL = 0x07,
      JSVAL_TYPE_PRIVATE_GCTHING = 0x08,
      JSVAL_TYPE_BIGINT = 0x09,
      JSVAL_TYPE_OBJECT = 0x0c,

      // This type never appears in a Value; it's only an out-of-band value.
      JSVAL_TYPE_UNKNOWN = 0x20
    };
    '''
    def tag_to_name(self, tag):
        if tag == 0x0:
            return "double"
        elif tag == 0x1:
            return "int32"
        elif tag == 0x2:
            return "boolean"
        elif tag == 0x3:
            return "undefined"
        elif tag == 0x4:
            return "null"
        elif tag == 0x5:
            return "magic"
        elif tag == 0x6:
            return "string"
        elif tag == 0x7:
            return "symbol"
        elif tag == 0x8:
            return "privateGcThing"
        elif tag == 0x9:
            return "bigInt"
        elif tag == 0xc:
            return "object"
        elif tag == 0x20:
            return "unknown"
        else:
            return "[-] UNKNOWN TYPE: " + str(tag)

JSObjectInfo()

