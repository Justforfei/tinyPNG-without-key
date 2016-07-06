var fs = require('fs')
var path = require('path')

var request = require('request');

var fileList = [];
var downloadList = [];
var existFiles = [];

var config = {
    originPath: './images/',
    destPath: './dest/',
    includeFileType: [
        '.png',
        '.jpg'   // remove it to ignore .jpg
    ]
}

function getFileList(callback) {
    fs.readdir(config.originPath, function(err, list){
        if (err) {
            console.log("fail to readFile")
        }

        list.forEach(function(file){
            if(config.includeFileType.indexOf(path.extname(file)) > -1) fileList.push(file);
        })

        callback && callback();
    })
}

function uploadFileList(callback) {
    fs.exists('./downloadList.json', function (exists) {
        if(exists) {
            var data = fs.readFile('./downloadList.json', "utf8", function(err, data) {
                if(err) console.log(err)
                var tempData = data.toString(),
                    downList = JSON.parse(tempData);
                downList.forEach(function(ele, idx){
                    var fileIdx = fileList.indexOf(ele.name);
                    if(fileIdx != -1) {
                        if(fs.statSync(config.destPath+ele.name)["size"] == ele.size){
                            var existFile= fileList.splice(fileIdx,1);
                            existFiles.push(existFile);
                        }
                    }else{
                        console.log(ele.name)
                    }
                })
                uploadFile()
            });


        }else {
            console.log('empty')
            return;
        }
    })


    function uploadFile() {
        var curFileInfo = {
            name: '',
            size: 0,
            compressSize: 0,
            extname: '',
            url: ''
        }
        if(fileList.length != 0){
            var file = fileList.pop();
            var filePath = './images/' + file;
            curFileInfo.name = file;
            curFileInfo.size = fs.statSync(filePath).size;
            curFileInfo.extname = path.extname(filePath).replace('.','');

            var options = {
              url: "https://tinypng.com/site/shrink",
              method: "post",
              headers: {
                "Accept" : "/",
                "Accept-Encoding" : "gzip, deflate, br",
                "Accept-Language" : "zh-CN,zh;q=0.8",
                "Cache-Control" : "no-cache",
                "Content-Length" : curFileInfo.size,
                "Content-Type" : curFileInfo.extname,
                "Pragma" : "no-cache",
                "Host" : "tinypng.com",
                "Connection"  : "keep-alive",
                "DNT" : 1,
                "Referer" : "https://tinypng.com/",
                "User-Agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.63 Safari/537.36"
              },
              'timeout': 5000
            }
            var readFileStream = fs.createReadStream(filePath).pipe(request(options, function(err, httpResponse, body) {
                if (err) {
                    if(err.code === 'ETIMEDOUT') {
                        console.log('upload ETIMEDOUT')
                    }
                    return ;
                }

                var data = JSON.parse(body);
                curFileInfo.url = data.output.url;
                curFileInfo.size = data.output.size;
                downloadList.push(curFileInfo)
                console.log(downloadList)

                if(fileList.length == 0) {
                    callback && callback();
                }else {
                    uploadFile()
                }
            }))
        }
        // readFileStream.on('end', function() {console.log('readFileStream END') })
    }

}

function downloadFileList() {
    var i = 0;
    var data = JSON.stringify(downloadList);
    console.log('data '+data)
    console.log('existFiles '+existFiles)

    function downloadFile() {
        var fileUrl = downloadList.pop()
        request(fileUrl.url,{timeout: 3000}).on('error', function(err){
            if (err) {
                if(err.code === 'ETIMEDOUT') {
                    console.log('download ETIMEDOUT')
                }
                return ;
            }
        }).pipe(fs.createWriteStream(config.destPath + fileUrl.name))

        if(downloadList.length != 0) {
            downloadFile()
        }
    }

    downloadFile()

    fs.writeFile('./downloadList.json', data, function (err) {
      if (err) console.log(err);

      console.log('文件写入成功');
    });
}

// upload()

getFileList(function(){
    uploadFileList(function(){
        downloadFileList();
    });
});