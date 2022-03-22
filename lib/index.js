// 实现这个项目的构建任务

const { src, dest, parallel, series, watch } = require('gulp')
const loadGulpPlugins = require('gulp-load-plugins')
const plugins = loadGulpPlugins()
const del = require('del')

const cwd = process.cwd()
let config = {
    // default config
    build: {
        src: 'src',
        temp: '.tmp',
        dist: 'dist',
        public: 'public',
        paths: {
            styles: 'assets/styles/*.scss',
            scripts: 'assets/scripts/*.js',
            pages: '*.html',
            images: 'assets/images/**',
            fonts: 'assets/fonts/**'
        }
    }
}
try{
    // 合并配置项
    const loadConfig = require(`${cwd}/pages.config.js`)
    config = Object.assign({}, config, loadConfig)
} catch (e) {}

const clean = () => {
    // del本身返回的是promise,gulp可以接收promise来结束任务
    return del(config.build.dist, config.build.temp)
}


// 版本有更新
const sass = require('gulp-sass')(require('sass'))
// 样式文件
const style = () => {
    // base为基准路径，即在dest保存文件的时候，会将src后面的路径都保留下来
    // 此处会生成对应的文件为 dist/assets/styles/*.scss
    return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src})// 添加前缀
        // .pipe(sass({ outputStyle: 'expanded' })) // 处理scss文件， _开头的scss文件不会去处理
        .pipe(sass({ outputStyle: 'expanded' })) // 处理scss文件， _开头的scss文件不会去处理
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))
}
// js文件的编译
// const babel = require('gulp-babel')
const scripts = () => {
    return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.babel({
            presets: [
                // preset-env js的最新的所有新特性的一个集合
                // 提取文件时用到，require在当前文件找，如果没有就向上层寻找，知道找到为止
                require('@babel/preset-env')
            ]
        }))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))
}
// html文件的编译，swig模板引擎



// const swig = require('gulp-swig')
const page = () => {
    return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src }) // 任意子目录的html文件
        .pipe(plugins.swig({ data: config.data, defaults: { cache: false } }))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))
}
// 图片和字体文件
// gulp-imagemin 8.0版本需要动态引入
const image = () => {
    return import('gulp-imagemin').then(imagemin => {
        src(config.build.paths.images, { base: config.build.src, cwd: config.build.src})
            .pipe(imagemin.default())
            .pipe(dest(config.build.dist))
    })
}

// 字体文件，里面可能有svg也用imagemin处理下,其他只是复制
const font = () => {
    return import('gulp-imagemin').then(imagemin => {
        src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
            .pipe(imagemin.default())
            .pipe(dest(config.build.dist))
    })
}
// 其他文件，比如public里面的文件
const extra = () => {
    return src('**', { base: config.build.public, cwd: config.build.public})
        .pipe(dest(config.build.dist))
}

// 开发服务器
const browserSync = require('browser-sync')
const bs = browserSync.create() // 创建一个开发服务器
const serve = () => {
    // 监听文件变化
    watch(config.build.paths.styles, { cwd: config.build.src }, style)// 变化后执行 yarn gulp style
    watch(config.build.paths.scripts, { cwd: config.build.src }, scripts)
    watch(config.build.paths.pages, { cwd: config.build.src }, page)
    // watch('src/assets/images/**', image)
    // watch('src/assets/fonts/**', font)
    // watch('public/**', extra)
    // 当目录下面的文件又变化时执行
    watch([
        config.build.paths.images,
        config.build.paths.fonts,
    ], { cwd: config.build.src }, bs.reload)
    watch([
        '**'
    ], { cwd: config.build.public }, bs.reload)
    bs.init({
        notify: false, // 关闭提升
        // files: 'dist/**', // 监听文件，热更新
        server: {
            baseDir: ['temp', 'src', 'public'], // 可以设置多个，浏览器查找文件时，先从dist找，再src,最后public
            // port: 2080,
            // open: false,
            routes: {
                // 优先于baseDir
                '/node_modules': 'node_modules'
            }
        }
    })
}

// 处理dist文件里面的问题
// 处理注释问题，还有处理文件路径引用的问题
const useref = () => {
    return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp})
        .pipe(plugins.useref({ searchPath: [config.build.temp, '.']}))
        .pipe(plugins.if(/\.js$/, plugins.uglify())) // 判断是否为js文件
        .pipe(plugins.if(/\.css$/, plugins.cleanCss())) // 判断是否为js文件
        .pipe(plugins.if(/\.html$/, plugins.htmlmin({
            collapseWhitespace: true,
            minifyJS: true,
            minifyCSS: true
        }))) // 默认值删除空行，其他行内的不处理
        .pipe(dest(config.build.dist)) // 不能边读编写（同时都在dist目录下）
}


// 组合任务
// src目录下的文件的构建
const compile = parallel(style, scripts,page)
// 所有文件的构建
const build = series(clean, parallel(series(compile, useref), image, font, extra))

const dev = series(compile, serve)
module.exports = {
    build,
    clean,
    dev,
}
