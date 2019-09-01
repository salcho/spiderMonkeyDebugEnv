class JSObjectInfo(gdb.Function):
    def __init__(self):
        super (JSObjectInfo, self).__init__ ("jsObjInfo")

    def invoke(self, pointer_jsvalue):
        is_long = False
        if str(pointer_jsvalue.type) == 'long':
            is_long = True
        if not is_long and str(pointer_jsvalue.type) != 'JS::Value':
            return "[-] Not a JS::Value! Got a " + str(pointer_jsvalue.type) + " instead"


        if not is_long:
            value_prefix = "((JS::Value)*%s)" % pointer_jsvalue.address
            taggedPointer = int(gdb.parse_and_eval("%s.asBits_" % value_prefix))
            print("[*] Parsing JS::Value at     " + str(pointer_jsvalue.address))
            print("[*] Tagged pointer is        " + hex(taggedPointer))
            tag = (((0xffff << 48) & taggedPointer) >> 47) & 0xf
            tagName = self.tag_to_name(tag)
            print("[*] Tag is                   " + tagName)
            payload = ((2 ** 48) - 1) & taggedPointer
            print("[*] Payload is               " + hex(payload))
        else:
            payload = pointer_jsvalue

        if is_long or tagName == 'object':
            obj_prefix = "((JSObject)*%s)" % payload
            className = gdb.parse_and_eval("%s.groupRaw().clasp_.name" % obj_prefix).string()
            print("[*] Class name is            " + className)
            if className == 'Array':
                array_prefix = "(('js::ArrayObject')*%s)" % payload
                length = int(gdb.parse_and_eval("%s.length()" % array_prefix))
                print("[*] Length:                  " + str(length))
                print("\nElements:")
                gdb.execute("x/%dx %s.elements_" % (length, array_prefix))


        return pointer_jsvalue

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

