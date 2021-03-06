const path = require('path');
const webpack = require('webpack');
var fs = require('fs');
const packagejson = require("./package.json")
var HtmlWebpackPlugin = require('html-webpack-plugin');
var OpenBrowserPlugin = require('open-browser-webpack-plugin');


function getEntryAndHtmlPlugin(siteMaps,isBuild){
  var re = {entry:{},htmlplugins:[]};

  for(var siteName in siteMaps) {
    var sitInfo = siteMaps[siteName];
    re.entry[siteName] = sitInfo.path;//js多入口字典对象
    if(sitInfo.html) {
      re.htmlplugins.push(new HtmlWebpackPlugin({
        // 正常的：filename: siteName+'.html', //打包出来的html名字
        filename: (siteName)+'.html', //打包出来的html名字
        template: './entry/index.html', //模版路径
        inject: 'body' ,
        chunks:[siteName],//js注入的名字
        hash:true
      }));
    }
  }
  return re;
}


var rmdirSync = (function(){
  function iterator(url,dirs){
      var stat = fs.statSync(url);
      if(stat.isDirectory()){
          dirs.unshift(url);//收集目录
          inner(url,dirs);
      }else if(stat.isFile()){
          fs.unlinkSync(url);//直接删除文件
      }
  }
  function inner(path,dirs){
      var arr = fs.readdirSync(path);
      for(var i = 0, el ; el = arr[i++];){
          iterator(path+"/"+el,dirs);
      }
  }
  return function(dir,cb){
      cb = cb || function(){};
      var dirs = [];

      try{
          iterator(dir,dirs);
          for(var i = 0, el ; el = dirs[i++];){
              fs.rmdirSync(el);//一次性删除所有收集到的目录
          }
          cb()
      }catch(e){//如果文件或目录本来就不存在，fs.statSync会报错，不过我们还是当成没有异常发生
          e.code === "ENOENT" ? cb() : cb(e);
      }
  }
})();

module.exports = function (env) {
  const action = env.action||'start';
  const isBuild = action==='build';
  const nodeEnv =  env.env || 'development';
  let appList = {
    index:{html:true,path:"./entry/index.js"},
 };
  if(isBuild){
    appList = {
      [`snkcomment-${packagejson.version}`]:{html:false,path:"./entry/index.js"},
   }
  }
  
  var entryAndHtmlPlugin = getEntryAndHtmlPlugin(appList,isBuild);
  var entry = entryAndHtmlPlugin.entry;
  var plugins= [
      new webpack.NamedModulesPlugin(),
      new webpack.LoaderOptionsPlugin({
          minimize: true
      }),
  ];

  plugins = plugins.concat(entryAndHtmlPlugin.htmlplugins);

  if(isBuild){
    rmdirSync('./dist');
  }else{
    const openurl = env.openurl || '';
    if(openurl.length > 0) {
      plugins.push(new OpenBrowserPlugin({ url: openurl }));
    }
    plugins.push(new webpack.HotModuleReplacementPlugin());
  }



return {
  context: path.resolve(__dirname, './'),
  mode:nodeEnv,
  entry:entry,
  output: {
    filename: '[name].js',
    chunkFilename: !isBuild ? '[name].bundle.js' : '[name].[chunkhash:8].min.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: isBuild?'./':'/'
  },
  watchOptions: {
    poll: true
  },
  devtool: isBuild ? 'cheap-module-source-map':'#source-map',
  resolve: {
     mainFiles: ["index.web","index"],
     modules: [path.resolve(__dirname, "src"), "node_modules"]
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: {
          loader:'babel-loader',
          options:{
            "compact": false,
            "presets": [
              "@babel/preset-env"
            ],
            "plugins": [
              "@babel/plugin-proposal-class-properties",
            ]
          }
        },
      },
      {
        test: /\.css$/,
        use: [ 'style-loader', 
            {
                loader: "css-loader",
              
            },{
              loader:"postcss-loader",
               options: {
                plugins: (loader) => [
                  require('postcss-import')({ root: loader.resourcePath }),
                  require('autoprefixer')(),
                ]
              }
            } ],
      },
      {
        test: require.resolve('jquery'),
        use: [{
           loader: 'expose-loader',
           options: 'jQuery'
        },{
           loader: 'expose-loader',
           options: '$'
        }]
     },
      { 
        test: /\.(png|jpg|jpeg|gif|woff)$/, 
        loader: 'url-loader?limit=6144&name=imgs/[path][name].[ext]'
      },
       {
          test: /\.(eot|svg|ttf|woff|woff2)$/,
          loader: 'file-loader?name=fonts/[name].[ext]'
      },
      {
            test: /\.less$/,
            use: [{
                loader: "style-loader" 
            }, {
                loader: "css-loader" ,
                 options:{
                   minimize:true
                },
            }, 
            {
              loader:"postcss-loader",
               options: {
                plugins: (loader) => [
                  require('postcss-import')({ root: loader.resourcePath }),
                  require('autoprefixer')(),
                ]
              }
            },
            {
                loader: "less-loader",
                options: {
                  javascriptEnabled: true
                }
            }]
      }
    ],
  },
  plugins:plugins,
};
}
