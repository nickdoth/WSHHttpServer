/** 请求的路由机制 */

//MIME类型
var mimeType = {
    "html" : "text/html",
    "jpg" : "image/jpeg",
    "png" : "image/png",
    "gif" : "image/gif",
    "txt" : "text/plain",
    "js" : "application/javascript",
    "*" : "text/plain"
};

function getFileType(filePath) {
    return filePath.split("/").pop().split(".").pop();
}


var Router = exports.Router = function(_pathRouter) {
    this.pathRouter = _pathRouter;
    Router.routerList.push(this);
    
}

//<静态成员>
//路由列表
Router.routerList = [];

//错误页面
Router.errorPages = {
    "404" : "404.html"

};

//路由过程
var route = Router.route = function(request, response) {
    var path = request.path();
    var stat = 200;
    //真实路径
    var realPath = null;
    //查找所有路由, 从后到前查询
    for(var i = Router.routerList.length - 1; i >= 0; i--) {
        if(realPath = Router.routerList[i].getRealPath(path)) {
            break;
        }
    }
    if(!realPath) {
        realPath = Router.errorPages["404"];
        stat = 404;
    }
    var fileType = getFileType(realPath);
    var mime = mimeType[fileType] || mimeType["*"];
    
    response.writeHeader(stat, {
        "Content-Type" : mime,
        "Server" : "WSH HTTP Server/0.1 (WSH/" + WSH.Version + ")",
        "Content-Encoding" : "deflate"
        //"Content-Disposition" : "inline; filename=\"test.jpg\""
    });

    response.fromFile(realPath);
    response.end();
    
};
//</静态成员>

//<对象原型>
//获取真实文件路径
Router.prototype.getRealPath = function(reqPath) {
    return this.pathRouter[reqPath] || null;
}
//</对象原型>
