/**
 * Simple HTTP Server On Windows Script Host
 * So there is a big TODO...QAQ
 * TODO: How can I use JScript ONLY??
 */
define(function(require) {
    
    //对象体
    var http = {};

    //状态码对应名称
    var STAT_NAME = {
        100 : "Continue",
        200 : "OK",
        206 : "Partial Content",
        301 : "Moved Permanently",
        302 : "Found",
        304 : "Not Modified",
        400 : "Bad Request",
        401 : "Unauthorized",
        403 : "Forbidden",
        404 : "Not Found",
        500 : "Internal Server Error",
        503 : "Service Unavailable"
        
        
    };
    
    //用于调试输出
    function print(msg)
    {
       WScript.Stdout.write("[" + (new Date()) + "] " + msg + "\r\n");
    }
    
    
    /** socket操作的部分 */
    var global = global || this;
    var wshShell = WScript.CreateObject("WScript.Shell");

    
    //主socket监听进程
    var listener;

    function listen(port)
    {
       listener = WScript.CreateObject("MSWinsock.Winsock.1", "listener_");

       listener.localPort = port;
       listener.bind();
       listener.listen();

       print("Listening Port " + port);
    }

    //请求的连接
    var connections = {};

    
    /* 客户端请求连接时的事件 */
    //Affair[1/n]:WSH事件监听只能注册到全局
    var listener_ConnectionRequest = global.listener_ConnectionRequest = function(requestID)
    {
       print("Connection request " + requestID);
       connections[requestID] = {};
       var connection = connections[requestID].listener =
    WScript.CreateObject("MSWinsock.Winsock", "listener_");

       connection.accept(requestID);

       
    }

    /* 客户端数据到达后的事件 */
    var listener_DataArrival = global.listener_DataArrival = function(length)
    {
       print("Accepted " + length + " bytes " + this.socketHandle);

       //var str = "\0\0\0\0\0";

       //global.listener000 = this;
       
       var reqData = getSckData(this);
       
       //this.getData(str, vbString);

       //print("" + reqData);
       
       //this.sendData("HTTP/1.1 200 OK\r\n\r\n<h1>Hello JScript!</h1>");
       
       //处理一个请求
       var request = connections[this.socketHandle].request = new Request(reqData);
       //新建一个响应
       var response = connections[this.socketHandle].response = new Response(this);
       
       print(request.head.join(" "));
       
       //处理并发送响应
       dataFactory(request, response);
       
       
    }

    /* 每次sendData结束后广播的事件 */
    var listener_SendComplete = global.listener_SendComplete = function()
    {
        
        
        var next = connections[this.socketHandle].response.queue.shift();
        if(next === SEND_END) {
            print("已收到响应队列结束标志, Socket Closing...");
            this.close();
        }
        else {
            print("响应数据已发送完成, 准备发送下一个");
            this.sendData(next);
        }
    }

    /* 保持运行 */
    function idle()
    {
       var ret = 0;

       while (ret != 1)
       {
          //ret = wshShell.Popup("Running...", 36000);
          WScript.sleep(1);
       }
    }
    
    
    
    
    /** Response类: 在数据交换时实例化 */
    //设置END_SEND常量
    var SEND_END = ["SEND_END"];
    
    //response是装有write的那个对象
    var Response = function(_conn) {
        //当前socket连接
        this.conn = _conn;
        //响应数据(已弃用)
        this.responseData = "";
        //是否已发送响应头部
        this.hasHeader = false;
        //是否已出现响应末尾
        this.isEnded = false;
        //响应数据队列
        this.queue = [];
    };

    //response.write
    var respWrite = Response.prototype.write = function(data) {
        if(this.hasHeader && !this.isEnded) {
            //print("数据类型:"+typeof data);
            this.queue.push(data);
        }
        else {
            throw "Invalid write operation."
        }
        
        return;
    }

    //response.writeHeader
    var respWriteHeader = Response.prototype.writeHeader = function(statCode, headers) {
        var headerStr = "";
        if(!this.hasHeader && !this.isEnded) {
            headerStr = "HTTP/1.1 " + statCode + " " + STAT_NAME[statCode] + "\r\n";
            for(var n in headers) {
                headerStr += n + ": " + headers[n] + "\r\n";
            }
            headerStr += "\r\n";
            
            this.hasHeader = true;
        }
        else {
            throw "Invalid writeHeader operation."
        }
        this.queue.push(headerStr);

    }
    
    var respFromFile = Response.prototype.fromFile = function(uri) {
        var ado = new ActiveXObject("ADODB.Stream");
        var test = WScript.CreateObject("WSHSTest.Test");
        uri = uri.replace(/\//gi, "\\");
        //只读读取二进制文件
        ado.open();
        ado.Type = 1;
        ado.LoadFromFile(uri);
        //返回文件的所有字符
        var data = ado.Read();
        
        return this.write(test.Compress2(data));
    }
    
    var respEnd = Response.prototype.end = function() {

        
        //this.conn.close();
        this.isEnded = true;
        this.queue.push(SEND_END);
        //激活队列
        this.conn.sendData(this.queue.shift());
    }

    
    /** Request类: 分析请求头并组成对象 */
    //类的构造体
    var Request = function(__) {
        //私有成员
        var reqData = {}, head;
        
        //构造函数
        var _Request = function(_reqData) {
        
            //按行分开
            _reqData = _reqData.split("\n");
            //第一行按空格分开, 剔除第一行
            head = _reqData.shift().split(" ");
            //其余行变为KV数组
            var _key,_val;
            for(var n in _reqData) {
                //判断是否有空行; 空行以下为请求实体
                if(/^\s*$/.test(_reqData[n])) {
                    //调用处理POST数据的静态方法
                    //_Request.PostHandle.call(this, n);
                    break;
                }
                _reqData[n] = _reqData[n].split(": ");
                _key = _reqData[n].shift();
                _val = _reqData[n].join(": ");
                //赋值给私有成员reqData
                reqData[_key] = _val;
                
            }
            
            this.head = head;
        };
        
        //公有方法
        // 获取请求头对象
        _Request.prototype.getHeaders = function() {
            return reqData;
        };
        
        _Request.prototype.path = function() {
            return head[1];
        };
        
        
        
        //exports
        return new _Request(__);
    };
    
    
    
    /** 创建数据处理工厂以及开始监听的两个方法 */
    var dataFactory = function(response){response.end()};

    var createServer = http.createServer = function(_dataFactory) {
        if(typeof dataFactory !== "function") {
            throw new TypeError("dataFactory must be a function.");
        }
        
        //数据工厂的this在传入执行前会变为socket
        var factoryThis = {};
        
        //dataFactory.call(factoryThis, response);
        
        dataFactory = _dataFactory;
        
        return http;

    }

    http.listen = function(port) {
        listen(port);
        idle();
        return http;
    }
    
    return http
});