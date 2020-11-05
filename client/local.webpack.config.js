var path = require('path')
var webpack = require('webpack')

module.exports = {
  entry: './js/local.js',
  output: {
    path: path.resolve(__dirname, './dist'),
    publicPath: '/dist/',
    filename: 'gaserver.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: [/node_modules/, /brace/]
      },
      {
    	  test: /\.ohm$/,
    	  loader: 'raw-loader'
      }
    ]
  },
  resolve: {

  },
  devServer: {
    historyApiFallback: true,
    noInfo: true,
    overlay: true
  },
  performance: {
    hints: false
  },
  // devtool: 'inline-source-map',
  devtool: '#eval-source-map',
  externals: {
      "ace": true
  },
  target: 'node'
}

if (process.env.NODE_ENV === 'production') {
  module.exports.devtool = '#inline-source-map'
  // http://vue-loader.vuejs.org/en/workflow/production.html
  module.exports.plugins = (module.exports.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),
    /*new webpack.optimize.UglifyJsPlugin({
      sourceMap: true,
      compress: {
        warnings: false
      }
    }),*/
    new webpack.LoaderOptionsPlugin({
      minimize: true
    })
  ])
}
