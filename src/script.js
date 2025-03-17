let fromInput = document.getElementById("fromInput");
let toInput = document.getElementById("toInput");            // Объявление переменных для кнопок
let gen = document.getElementById("generator");

// Обработка генерации
gen.addEventListener("click", async () => {
    try {
        let data;

        // Получаем значения из полей "от" и "до"
        const from = parseInt(fromInput.value);
        const to = parseInt(toInput.value);

        // Проверяем, что диапазон корректен
        if (isNaN(from) || isNaN(to) || from >= to) {
            alert("Некорректный диапазон. Убедитесь, что 'от' меньше 'до'");
            return;
        }

        let randomNumber = Math.floor(Math.random() * (to - from + 1)) + from;
            // Если пользователь авторизован, получаем число с сервера
        const baseUrl = '';
        const response = await fetch (`${baseUrl}/api/get-number`, {
            credentials: 'include',
        });

        if (response.ok) {
            data = await response.json();
        } else {
            data = { success: false };
        }

        function genResult() {
            if (data.success === false) {
                // Если число с сервера недоступно, используем обычный генератор
                if (from >= 0 && to <= 200000) {
                    animateButton(randomNumber);
                } else {
                    alert("Число не соответствует диапазону");
                }
            } else {
                if (data.success === true) {
                    // Отображение числа, полученное с сервера
                    if (data.number >= from && data.number <= to) {
                        animateButton(data.number);
                    }
                } else {
                    gen.value = data.message;
                }
            }
        }

        genResult();
    } catch (error) {
        alert("Ошибка. Перезагрузите страницу");
        console.error(error);
    }
});

// Функция для анимации числа на кнопке
function animateButton(finalNumber) {
    let currentNumber = 0;
    const duration = 1000; // Длительность анимации в миллисекундах
    const increment = finalNumber / (duration / 16); // 16ms за кадр для 60fps

    function updateNumber() {
        if (currentNumber < finalNumber) {
            currentNumber += increment;
            gen.value = Math.round(currentNumber); // Обновляем значение кнопки
            requestAnimationFrame(updateNumber);
        } else {
            gen.value = finalNumber; // Устанавливаем финальное значение
        }
    }

    updateNumber();
}
