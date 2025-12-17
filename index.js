const express = require('express')
const path = require('path');
require('dotenv').config();
const database = require('./config/database');
const adminRoutes = require('./routes/admin/index.route');
const clientRoutes = require('./routes/client/index.route');
const variablesConfig = require('./config/variable');
const cookieParser = require('cookie-parser');
const flash = require('express-flash');
const session = require('express-session');

const app = express()
const port = 3000

//kết nối database
database.connect();

//Thiết lập view
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//Thiết lập thư mục tĩnh
app.use(express.static(path.join(__dirname, 'public')));

//tạo biến cục file pug
app.locals.pathAdmin = variablesConfig.pathAdmin;

// Tạo biến toàn cục trong các file backend
global.pathAdmin = variablesConfig.pathAdmin;

// Cho phép gửi từ data lên json
app.use(express.json());

//Sử dụng cookie parser
app.use(cookieParser("SFGWHSDSGSDSD"));

// Nhúng Flash
app.use(session({ cookie: { maxAge: 60000 }}));
app.use(flash());


//Thiết lập đường dẫn
app.use(`/${variablesConfig.pathAdmin}`, adminRoutes);
app.use('/', clientRoutes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})