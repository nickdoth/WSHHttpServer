
//简单的模块框架 For Microsoft JScript Host
//提醒:所有的ActiveXObject都是只读的, 并且不能通过for...in获取成员, 所有的成员方法不能使用call和apply
(function(global, undefined){
    
    //如果不是WScript环境则退出
    if(!global.WScript && !global.WSH) {
        //如果是nodejs
        if(global.require && global.require("child_process")) {
            global.console.error("You cannot run this file on nodejs!");
        }
        throw "Error: this file should run on Windows Scripting Host";
        return
    }
    
    var jscript = {};
    
    //已缓存的模块
    var cashedMod = {};
    
    //echo : print输出
    
    function print(s) {
        //global.WScript.echo(s);
    }
    
    //trim:去除str的前后空格
    function trim(str) {

        return str.replace(/^\s\s*/, '' ).replace(/\s\s*$/, '' );

    }
    
    //文件系统对象
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    
    //当前目录
    var CURRENT_PATH = fso.GetFolder(".").Path;
    //JScript目录
    var BIN_PATH = WSH.ScriptFullName.split("\\");
    BIN_PATH.pop();
    BIN_PATH = BIN_PATH.join("\\");
    
    //print.call(this,"hello");
    
    //从文件读取数据
    function loadFromFile(uri) {
        
        //只读读取文件
        var fp = fso.openTextFile(uri, 1);
        //返回文件的所有字符
        var data = fp.readAll();
        
        return data;
    }
    
    //将uri转为id
    function id2uri(str) {
        
        //去除头尾空白
        str = trim(str);
        //将UNIX风格路径转为Win32风格
        str = str.replace(/\//gi, "\\");
        //绝对路径
        var ABS_PATH = /^\s*[a-zA-Z]\s*:\s*\\/;
        //相对路径(无点)
        var REL_PATH_WITHOUT_POINT = /^[\w]\w*\\/;
        //相对路径(有点)
        var REL_PATH_WITH_POINT = /^[\.]\w*\\/;
        //只有文件名
        var FILENAME = /^[\w\.]*$/
        //是否有扩展名
        var EXTENTION = /\.\w*$/;
        
        var uri = "";
        if(REL_PATH_WITHOUT_POINT.test(str)) {
            uri = BIN_PATH + "\\" + str;
        }
        if(FILENAME.test(str)) {
            uri = CURRENT_PATH + "\\" + str;
        }
        else if(REL_PATH_WITH_POINT.test(str)) {
            uri = CURRENT_PATH + "\\" + str.slice(1);
        }
        else if(ABS_PATH.test(str)) {
            uri = str;
        }
        
        if(!EXTENTION.test(uri)) {
            uri += ".js";
        }
        //print(str)
        return uri;
    }
    
    //加载模块
    function loadMod(id) {
        var code = loadFromFile(id2uri(id));
        //构造eval空间
        code = 'false || (function(define, exports){\n' + code + ' \n})';
        //构造this作用域
        var scope = {
            __ID__ : id,
            global : global
        };
        //建立nodejs风格的模块定义器exports
        var exports = {};
        
        //执行
        var evalSpace = eval(code);
        //是否执行了define
        var isDefine = false;
        evalSpace(function() {
            //为define更改this作用域
            define.apply(scope, arguments);
            //使用了define;
            isDefine = true;
        
        }, exports);
        
        //如果没有使用define, 则判断模块采用了nodejs风格的模块定义, 将exports对象赋值给cashedMod
        if(!isDefine) {
            cashedMod[id2uri(id)] = exports;
        }
        return true;
    }
    
    
    //引用模块的require
    var require = function(id) {
        var uri = id2uri( id );
        return cashedMod[uri] || (loadMod(id) && cashedMod[uri]);
    }
    
    //定义模块的define
    var define = function(id, deps, factory) {
        //根据参数个数确定参数位置
        var argNum = arguments.length;
        if(argNum === 1) {
            factory =  id;
            id = null;
        }
        else if(argNum === 2) {
            factory = deps;
            deps = null;
        }
        
        //从eval作用域中读取uri
        if(!id) {
            id = this.__ID__;
        }
        var uri = id2uri(id);
        cashedMod[uri] = factory.call(global, require) || {};
    }

    
    //@trick : 对只给VBScript有MsgBox的行为进行谴责(误)
    var msgBox = global.MsgBox = function(str, type, title) {
        var _mb = new ActiveXObject("WScript.Shell");
        //_mb = _mb.popup;
        return _mb.popup(str, type, title);
    }
    
    
    //use过程:在eval域中传入define和require
    var use = (function() {
        var argv = global.WSH.Arguments;
        if(argv.length) {
            loadMod(argv(0).toString());
        }
        else {
            print("jscript [<path>/]<filename|filename.ext>");
        }
    })();
        
    
    
    
    //exports
    jscript.define = define;
    jscript.require = require;
    //global.define = define;
    global.jscript = jscript;
    global.global = global;
    
})(this)
