const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.port || 3000;

// Создание базы данных и таблицы пользователей
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    db.run (`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
        `);
})

// Настройка сессий
app.use(session({
    secret: '603492175qQ',       // Секретный ключ для подписи сессии
    resave: false,
    saveUninitialized: true,
}));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware для проверки авторизации
const requireAuth = (req, res, next) => {
    if (req.session.loggedIn) {
        next();    // Пользователь авторизован
    } else {
        res.redirect('/login');
    }
}

// Обслуживание статических файлов
app.use(express.static(path.join(__dirname, '..', 'src')));
app.use('/inputs', requireAuth, express.static(path.join(__dirname, '..', 'inputs')));
// Обслуживание статических файлов из папки fonts
app.use('/font', express.static(path.join(__dirname, '..', 'font')));
app.use('/img', express.static(path.join(__dirname, '..', 'img')));


// Маршрут для корневого URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'src', 'index.html'));
  });

app.get('/inputs', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'inputs', 'index.html'));
})

// Маршрут для авторизации
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'inputs', 'login.html'));
})

// Маршрут для регистрации
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'inputs', 'register.html'));
})



// Переменная для хранения числа
let savedNumber = null;

// Маршрут для входа
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
            res.status(500).send({ success: false, message: 'Ошибка базы данных' });
        } 

        if (!row) {
            return res.status(401).send({ success: false, message: 'Неверные учетные данные' });
        }

        // Проверяем пароль
        if (row.password === password) {
            req.session.loggedIn = true;
            req.session.username = username;
            res.send({ success: true, message: 'Вход в систему прошел успешно' });
        } else {
            res.status(401).send({ success: false, message: 'Неверные учетные даннные' });
        }
    });
});

// Регистрация пользователя
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // Проверяем количество пользователей в БД
    db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
        if (err) {
            return res.status(500).send({ success: false, message: 'Ошибка базы данных' });
        }

        // Если уже зарегистрировано 2 пользователя, запрещаем регистрацию
        if (row.count >= 2) {
            return res.status(400).send({ success: false, message: 'Достигнуто максимальное кол-во пользователей' });
        }

        // Проверяем, что пользователь еще не зарегистрирован
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                return res.status(500).send({ success: false, message: 'Ошибка базы данных' });
            }

            if (row) {
                return res.status(400).send({ success: false, message: 'Пользователь уже существует' });
            }

            // Сохраняем пользователя в БД
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
                if (err) {
                    return res.status(500).send({ success: false, message: 'Ошибка базы данных' });
                }

                res.send({ success: true, message: 'Пользователь успешно зарегестрирован' });
            });
        });
    });
});

// Маршрут для выхода
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.send({ success: true, message: 'Успешно вышел из системы' });
    });
});

// Маршрут для сохранения числа с телефона
app.post('/api/save-number', (req, res) => {
    const number = req.body.number;
    if (number && !isNaN(number)) {
        // Сохраняем число в сесси пользователя
        req.session.savedNumber = number;
        req.session.numberUsed = false;
        res.send({ success: true, message: "Число сохранено!" });
    } else {
        res.status(400).send({ success: false, message: "Некорректное число" });
    }
});

// Маршрут для получения числа с компьютреа
app.get('/api/get-number', (req, res) => {
    if (req.session.loggedIn) {
        if (req.session.savedNumber !== undefined && !req.session.numberUsed) {
            req.session.numberUsed = true; // Устанавливаем флаг, что число использовано
            res.json({ success: true, number: req.session.savedNumber });
        } else {
            // Если число использовано, возвращаем ошибку, но не сбрасываем число
            res.status(404).send(({ success: false, message: "Число уже использовано. Ожидайте новое значение."}));
        }
     } else {
         // Если пользователь не авторизован, возвращаем ошибку
         res.status(403).send({ success: false, message: "Доступ запрещен. Требуется авторизация. " });
     }
});

// Сброс числа
app.post('/api/reset-number', (req, res) => {
    if (req.session.loggedIn) {
        req.session.savedNumber = null;
        req.session.numberUsed = false;
        res.send({ success: true, message: "Число сброшено. Можно сгенерировать новое." });
    } else {
        res.status(403).send({ success: false, message: "Доступ запрещен. Требуется авторизация." });
    }
})

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
})
