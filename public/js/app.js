import { db, collection, onSnapshot } from './firebase-config.js';

// دالة لعرض التطبيقات
function displayApps(apps, containerId, limit = 8) {
    const container = document.getElementById(containerId);
    const limitedApps = apps.slice(0, limit);
    
    container.innerHTML = limitedApps.map(app => `
        <div class="app-card bg-white rounded-xl shadow-md overflow-hidden">
            <div class="relative">
                <img src="${app.icon}" alt="${app.name}" class="w-full h-48 object-cover">
                ${app.featured ? '<span class="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-sm">مميز</span>' : ''}
            </div>
            <div class="p-4">
                <h3 class="font-bold text-lg mb-2">${app.name}</h3>
                <p class="text-gray-600 text-sm mb-3">${app.description.substring(0, 100)}...</p>
                <div class="flex justify-between items-center">
                    <span class="text-yellow-500">
                        ${'★'.repeat(Math.floor(app.rating))}${'☆'.repeat(5 - Math.floor(app.rating))}
                    </span>
                    <span class="text-gray-500 text-sm">${app.downloads} تحميل</span>
                </div>
                <div class="mt-4 flex space-x-2 space-x-reverse">
                    <button class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        تحميل
                    </button>
                    <button class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <i class="fas fa-info"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// تحميل وعرض التطبيقات
document.addEventListener('DOMContentLoaded', () => {
    const appsRef = collection(db, 'apps');
    
    onSnapshot(appsRef, (snapshot) => {
        const apps = [];
        snapshot.forEach(doc => {
            apps.push({ id: doc.id, ...doc.data() });
        });
        
        // التطبيقات المميزة
        const featuredApps = apps.filter(app => app.featured);
        displayApps(featuredApps, 'featuredApps');
        
        // التطبيقات الجديدة (آخر 8 تطبيقات)
        const newApps = apps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        displayApps(newApps, 'newApps');
    });
});
