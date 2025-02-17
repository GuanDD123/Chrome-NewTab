let db = null;
const DEFAULT_WALLPAPER = chrome.runtime.getURL('wallpaper/bc13haet9350hio.png');

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
        showToast("加载壁纸失败，使用默认壁纸", true);
        document.body.style.backgroundImage = `url(${DEFAULT_WALLPAPER})`;
    };
}

window.onload = function () {
    initDB(function (db) {
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
    });
};

function storeImageInIndexedDB(dataUrl) {
    initDB(function (db) {
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
                showToast("存储壁纸失败，请稍后重试", true);
            };
        };
        deleteRequest.onerror = function () {
            console.error('删除旧壁纸失败');
            showToast("删除旧壁纸失败", true);
        };
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('fileInput').addEventListener('change', changeWallpaper);
});

function changeWallpaper(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            showToast("请选择有效的图片文件", true);
            return;
        }
        showToast("正在加载图片...");
        const reader = new FileReader();
        reader.onload = function (e) {
            const result = e.target.result;
            if (result) {
                storeImageInIndexedDB(result);
                document.body.style.backgroundImage = `url(${result})`;
                showToast("壁纸已更新！");
                event.target.value = '';
            } else {
                showToast("加载失败，请重试", true);
            }
        };
        reader.onerror = () => showToast("文件读取失败，请检查文件", true);
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
