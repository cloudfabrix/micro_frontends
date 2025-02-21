import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export default {
    entry: path.join(__dirname, "src", "index.js"),
    output: {
      path:path.resolve(__dirname, "dist"),
    },
    plugins: [
      new HtmlWebpackPlugin({template: './src/index.html'})
    ],
    module: {
        rules: [
          {
            test: /\.?js$/,
            exclude: /node_modules/,
            use: {
              loader: "babel-loader",
              options: {
                presets: ['@babel/preset-env', '@babel/preset-react']
              }
            },
            resolve: {
              fullySpecified: false,
            },
          },
          {
            test: /\.css$/,
            use: ['style-loader', 'css-loader'],
          },
          {
            test: /\.mjs$/,
            resolve: {
              fullySpecified: false,
            },
          },
        ]
      },
  devServer: {
    port: 3000,
  }
};

