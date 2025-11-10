import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, storage, ref, uploadBytes, getDownloadURL } from '../public/js/firebase-config.js';

let currentEditingId = null;

// فتح وإغلاق المودال
window.openModal = function(app = null) {
    const modal = document.getElementById('appModal');
    const form = document.getElementById('appForm');
    
    if (app) {
        // وضع التعديل
        currentEditingId = app.id;
        form.name.value = app.name;
        form.category.value = app.category;
        form.description.value = app.description;
        form.downloadUrl.value = app.downloadUrl;
        form.featured.checked = app.featured;
        document.querySelector('h3').textContent = 'تعديل التطبيق';
    } else {
        // وضع الإضافة
        currentEditingId = null;
        form.reset();
        document.querySelector('h3').textContent = 'إضافة تطبيق جديد';
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

window.closeModal = function() {
    const modal = document.getElementById('appModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// رفع الصورة إلى Storage
async function uploadImage(file) {
    const storageRef = ref(storage, `app-icons/${Date.now()}-${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
}

// إضافة/تعديل تطبيق
document.getElementById('appForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const appData = {
        name: formData.get('name'),
        category: formData.get('category'),
        description: formData.get('description'),
        downloadUrl: formData.get('downloadUrl'),
        featured: formData.get('featured') === 'on',
        rating: 0,
        downloads: 0,
        createdAt: new Date().toISOString()
    };
    
    try {
        // رفع الصورة إذا كانت موجودة
        const iconFile = formData.get('icon');
        if (iconFile && iconFile.size > 0) {
            appData.icon = await uploadImage(iconFile);
        }
        
        if (currentEditingId) {
            // تحديث التطبيق
            await updateDoc(doc(db, 'apps', currentEditingId), appData);
        } else {
            // إضافة تطبيق جديد
            await addDoc(collection(db, 'apps'), appData);
        }
        
        closeModal();
        alert(currentEditingId ? 'تم تحديث التطبيق بنجاح' : 'تم إضافة التطبيق بنجاح');
    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ أثناء حفظ التطبيق');
    }
});

// عرض التطبيقات في الجدول
function displayAppsTable(apps) {
    const tbody = document.getElementById('appsTableBody');
    
    tbody.innerHTML = apps.map(app => `
        <tr class="border-b hover:bg-gray-50">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <img src="${app.icon}" alt="${app.name}" class="w-10 h-10 rounded-lg mr-3">
                    <div>
                        <div class="font-medium">${app.name}</div>
                        <div class="text-sm text-gray-500">${app.description.substring(0, 50)}...</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">${app.category}</span>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <span class="text-yellow-500 mr-1">★</span>
                    <span>${app.rating}</span>
                </div>
            </td>
            <td class="px-6 py-4">${app.downloads}</td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">نشط</span>
            </td>
            <td class="px-6 py-4">
                <div class="flex space-x-2 space-x-reverse">
                    <button onclick="openModal(${JSON.stringify(app).replace(/"/g, '&quot;')})" 
                            class="text-blue-600 hover:text-blue-900">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteApp('${app.id}')" 
                            class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// حذف تطبيق
window.deleteApp = async function(appId) {
    if (confirm('هل أنت متأكد من حذف هذا التطبيق؟')) {
        try {
            await deleteDoc(doc(db, 'apps', appId));
            alert('تم حذف التطبيق بنجاح');
        } catch (error) {
            console.error('Error:', error);
            alert('حدث خطأ أثناء حذف التطبيق');
        }
    }
}

// تحديث الإحصائيات
function updateStats(apps) {
    document.getElementById('totalApps').textContent = apps.length;
    document.getElementById('totalDownloads').textContent = apps.reduce((sum, app) => sum + app.downloads, 0);
    
    const averageRating = apps.length > 0 ? 
        (apps.reduce((sum, app) => sum + app.rating, 0) / apps.length).toFixed(1) : 0;
    document.getElementById('averageRating').textContent = averageRating;
}

// تحميل البيانات
document.addEventListener('DOMContentLoaded', () => {
    const appsRef = collection(db, 'apps');
    
    onSnapshot(appsRef, (snapshot) => {
        const apps = [];
        snapshot.forEach(doc => {
            apps.push({ id: doc.id, ...doc.data() });
        });
        
        displayAppsTable(apps);
        updateStats(apps);
    });
    
    // زر إضافة تطبيق
    document.getElementById('addAppBtn').addEventListener('click', () => openModal());
});
