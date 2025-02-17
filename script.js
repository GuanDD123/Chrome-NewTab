let db = null;
const DEFAULT_WALLPAPER = chrome.runtime.getURL('images/default-wallpaper.png');

function initDB(callback) {
    if (db) return callback(db);
    const request = indexedDB.open('wallpaperDB', 1);
    request.onupgradeneeded = function (event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('wallpapers')) {
            db.createObjectStore('wallpapers', { keyPath: 'id' });
        }
    };
    request.onsuccess = function (event) {
        db = event.target.result;
        callback(db);
    };
    request.onerror = function (event) {
        console.error('数据库打开失败:', event.target.error);
    };
}

window.onload = function () {
    initDB(function (db) {
        const request = indexedDB.open('wallpaperDB', 1);
        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('wallpapers')) {
                db.createObjectStore('wallpapers', { keyPath: 'id' });
            }
        };

        request.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction(['wallpapers'], 'readonly');
            const objectStore = transaction.objectStore('wallpapers');

            const getRequest = objectStore.get(1);
            getRequest.onsuccess = function () {
                const wallpaper = getRequest.result;

                if (!wallpaper || !wallpaper.imageData) {
                    document.body.style.backgroundImage = `url(${DEFAULT_WALLPAPER})`;
                    storeImageInIndexedDB(`url(${DEFAULT_WALLPAPER})`);
                } else {
                    document.body.style.backgroundImage = `url(${wallpaper.imageData})`;
                }
            };
            getRequest.onerror = function () {
                document.body.style.backgroundImage = `url(${DEFAULT_WALLPAPER})`;
                showToast("加载壁纸失败，使用默认壁纸", true);
            };
        };

        request.onerror = function (event) {
            console.error('打开 IndexedDB 失败:', event.target.error);
            document.body.style.backgroundImage = `url(${DEFAULT_WALLPAPER})`;
        };
    });
};

function storeImageInIndexedDB(dataUrl) {
    initDB(function (db) {
        const request = indexedDB.open('wallpaperDB', 1);
        request.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction(['wallpapers'], 'readwrite');
            const objectStore = transaction.objectStore('wallpapers');

            const deleteRequest = objectStore.delete(1);
            deleteRequest.onsuccess = function () {
                const wallpaper = { id: 1, imageData: dataUrl };
                const addRequest = objectStore.add(wallpaper);
                addRequest.onsuccess = function () {
                    console.log('壁纸已成功存储到 IndexedDB');
                };
                addRequest.onerror = function (event) {
                    console.error('存储到 IndexedDB 失败:', event.target.error);
                };
            };
            deleteRequest.onerror = function () {
                console.error('删除旧壁纸失败');
            };
        };

        request.onerror = function (event) {
            console.error('IndexedDB 打开失败:', event.target.error);
            showToast("壁纸保存失败，请重试", true);
        };
    });
}


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('fileInput').addEventListener('change', changeWallpaper);
});
function changeWallpaper(event) {
    const file = event.target.files[0];
    if (file) {
        showToast("正在加载图片...");
        const reader = new FileReader();
        reader.onload = function (e) {
            const result = e.target.result;
            if (result) {
                storeImageInIndexedDB(result);
                document.body.style.backgroundImage = `url(${result})`;
                showToast("壁纸已更新！");
            } else {
                showToast("加载失败，请重试", true);
            }
        };
        reader.onerror = () => showToast("文件读取失败", true);
        reader.readAsDataURL(file);
    }
}

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.right = '20px';
    toast.style.padding = '12px 24px';
    toast.style.background = isError ? '#ff4444' : '#4CAF50';
    toast.style.color = 'white';
    toast.style.borderRadius = '8px';
    toast.style.zIndex = '1000';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
