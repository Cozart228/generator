// Отправка числа на сервер
document.getElementById('phoneForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    const number = document.getElementById('numberInput').value;
    const baseUrl = '';
        
    try {const response = await fetch(`${baseUrl}/api/save-number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number }),
        credentials: 'include',
    });
    
    // Проверяем, успешел ли запрос
    if (!response.ok) {
        throw new Error (`Ошибка: ${response.status}`);
    }

    const data = await response.json();
    alert(data.message);
    } catch (error) {
        console.error("Ошибка при отправке числа", error);
        alert('Ошибка при отправке числа');
    }
});
