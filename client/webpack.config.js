var path = require('path')
var webpack = require('webpack')

module.exports = {
  entry: './js/main.js',
  output: {
    path: path.resolve(__dirname, './dist'),
    publicPath: '/dist/',
    filename: 'build.js'
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          loaders: {
          }
          // other vue-loader options go here
        }
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: [/node_modules/, /brace/]
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]?[hash]'
        }
      },
      {
    	test: /\.css$/,
    	loader: "style-loader!css-loader"
      },
      {
    	  test: /\.ohm$/,
    	  loader: 'raw-loader'
      }
    ]
  },
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm.js',
      'ace': 'js/ace/build/src'
    }
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
  node: {
      fs: 'empty'
  }
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
