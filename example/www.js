var http = require("http/http");
var Router = require("Router").Router;

var mainRouter = new Router({
    "/" : "index.html",
    "/static/img/test.jpg" : "test.jpg",
    "/plain-text" : "a.txt",
});

var randRouter = new Router({});
randRouter.getRealPath = function(reqPath) {
    if(reqPath === "/static/img/__rand") {
        var folderPath = "E:/Lib_4096886_outline/honshi/bg/";
        var fso = WSH.CreateObject("Scripting.FileSystemObject");
        var fileList = SETARRAY( fso.getFolder(folderPath).files );
        var randIndex = Math.round((fileList.length - 1) * Math.random());
        return folderPath + fileList[randIndex].name;
    }
    else {
        return null;
    }
}


http.createServer(function(request, response){
    Router.route(request, response);
}).listen(6015);