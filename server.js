let http = require('http')
let fs = require('fs')
let url = require('url')
let port = process.argv[2]

if (!port) {
  console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
  process.exit()
}

let server = http.createServer(function (request, response) {
  let parsedUrl = url.parse(request.url, true)
  let pathWithQuery = request.url
  let queryString = ''
  if (pathWithQuery.indexOf('?') >= 0) {
    queryString = pathWithQuery.substring(pathWithQuery.indexOf('?'))
  }
  let path = parsedUrl.pathname
  let query = parsedUrl.query
  let method = request.method
  const session = JSON.parse(fs.readFileSync('./session.json').toString())

  console.log('有个傻子发请求过来啦！路径（带查询参数）为：' + pathWithQuery)
  if (path === '/sign_in' && method === 'POST') {
    const userArray = JSON.parse(fs.readFileSync('./db/users.json').toString())
    const array = []
    request.on("data", chunk => {
      array.push(chunk)
    })
    request.on("end", () => {
      const string = Buffer.concat(array).toString()
      const obj = JSON.parse(string)
      const user = userArray.find((user) => user.name === obj.name &&
        user.password === obj.password)
      if (user === undefined) {
        response.statusCode = 404
        response.setHeader('Content-Type', 'text/json;charset=utf-8')
        response.end(`{"errorCode": 4001}`)
      } else {
        response.statusCode = 200
        const random = Math.random()

        session[random] = {user_id: user.id}
        fs.writeFileSync('./public/session.json', JSON.stringify(session))
        response.setHeader('Set-Cookie', `session_id=${random}; HttpOnly`)
        response.end()
      }
    })
  } else if (path === '/home.html') {
    const cookie = request.headers['cookie']
    let sessionId
    try {
      sessionId = cookie.split('; ').filter(s => s.indexOf('session_id') >= 0)[0]
        .split('=')[1]
    } catch (e) {
    }
    if (sessionId && session[sessionId]) {
      const userId = session[sessionId].user_id
      console.log(typeof userId)
      const userArray = JSON.parse(fs.readFileSync("./db/users.json").toString())
      const user = userArray.find(user => user.id === userId)
      const homeHtml = fs.readFileSync('./public/home.html').toString()
      let string
      if (user) {
        string = homeHtml.replace('{{loginStatus}}', '已登录')
          .replace('{{user.name}}', user.name)

      } else {
        string = homeHtml.replace('{{loginStatus}}', '未登录')
          .replace('{{user.name}}', '')

      }
      response.write(string)
    } else {
      const homeHtml = fs.readFileSync('./public/home.html').toString()
      const string = homeHtml.replace('{{loginStatus}}', '未登录')
        .replace('{{user.name}}', '')
      response.write(string)
    }
    response.end()
  } else if (path === "/register" && method === 'POST') {
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    const userArray = JSON.parse(fs.readFileSync('./db/users.json').toString())
    const array = []
    request.on('data', (chunk) => {
      array.push(chunk)
    })
    request.on('end', () => {
      const string = Buffer.concat(array).toString()
      const obj = JSON.parse(string)
      const lastUser = userArray[userArray.length - 1]
      const newUser = {id: lastUser ? lastUser.id + 1 : 1, name: obj.name, password: obj.password}
      userArray.push(newUser)
      fs.writeFileSync('./db/users.json', JSON.stringify(userArray))
      response.end()
    })
  } else {
    response.statusCode = 200
    const filePath = path === '/' ? '/index.html' : path
    const index = filePath.lastIndexOf('.')
    const suffix = filePath.substring(index)
    const fileTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.png': 'image/png',
      '.jpg': 'image/jpeg'
    }
    response.setHeader('Content-Type',
      `${fileTypes[suffix] || 'text/html'};charset=utf-8`)
    response.setHeader('Access-Control-Allow-Origin', 'https://run.plnkr.co')
    let content
    try {
      content = fs.readFileSync(`./public${filePath}`)
    } catch (error) {
      content = '文件不存在'
      response.statusCode = 404
    }
    response.write(content)
    response.end()
  }
})
server.listen(port)
console.log('监听' + port + ' 成功\n请在空中转体720度然后用电饭煲打开 http://localhost:' + port)

