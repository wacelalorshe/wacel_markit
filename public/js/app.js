import { 
    db, 
    collection, 
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    doc 
} from './firebase-config.js';

// حالة التطبيق
let allApps = [];
let filteredApps = [];
let currentCategory = 'all';

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// تهيئة التطبيق
function initializeApp() {
    loadApps();
    setupMobileMenu();
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // البحث
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', handleSearch);
    }
    
    // الفئات
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            filterByCategory(category);
        });
    });
}

// إعداد القائمة المتنقلة
function setupMobileMenu() {
    const menuButton = document.getElementById('mobileMenuButton');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // إغلاق القائمة عند النقر على رابط
    const mobileLinks = mobileMenu?.querySelectorAll('a');
    mobileLinks?.forEach(link => {
        link.addEventListener('click', function() {
            mobileMenu.classList.add('hidden');
        });
    });
}

// تحميل التطبيقات من Firebase
function loadApps() {
    const appsRef = collection(db, 'apps');
    
    onSnapshot(appsRef, (snapshot) => {
        allApps = [];
        snapshot.forEach(doc => {
            const appData = doc.data();
            allApps.push({ 
                id: doc.id, 
                ...appData,
                createdAt: appData.createdAt || new Date().toISOString(),
                downloads: appData.downloads || 0,
                rating: appData.rating || 0
            });
        });
        
        // تحديث الواجهة
        updateUI();
    }, (error) => {
        console.error('Error loading apps:', error);
        showError('حدث خطأ في تحميل التطبيقات');
    });
}

// تحديث واجهة المستخدم
function updateUI() {
    displayFeaturedApps();
    displayNewApps();
    displayTopApps();
}

// عرض التطبيقات المميزة
function displayFeaturedApps() {
    const featuredApps = allApps
        .filter(app => app.featured)
        .slice(0, 8);
    
    displayApps(featuredApps, 'featuredApps');
}

// عرض التطبيقات الجديدة
function displayNewApps() {
    const newApps = allApps
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8);
    
    displayApps(newApps, 'newApps');
}

// عرض التطبيقات الأكثر تحميلاً
function displayTopApps() {
    const topApps = allApps
        .sort((a, b) => b.downloads - a.downloads)
        .slice(0, 8);
    
    displayApps(topApps, 'topApps');
}

// عرض التطبيقات في حاوية محددة
function displayApps(apps, containerId) {
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    if (apps.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-inbox text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-500 text-lg">لا توجد تطبيقات لعرضها</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = apps.map(app => `
        <div class="app-card bg-white rounded-xl shadow-md overflow-hidden fade-in">
            <div class="relative">
                <img 
                    src="${app.icon || 'https://via.placeholder.com/300x200?text=No+Image'}" 
                    alt="${app.name}" 
                    class="w-full h-48 object-cover"
                    onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'"
                >
                ${app.featured ? `
                    <span class="featured-badge absolute top-2 right-2 text-white px-2 py-1 rounded-full text-sm font-semibold">
                        <i class="fas fa-star mr-1"></i>مميز
                    </span>
                ` : ''}
            </div>
            <div class="p-4">
                <h3 class="font-bold text-lg mb-2 text-gray-800 truncate">${app.name}</h3>
                <p class="text-gray-600 text-sm mb-3 leading-relaxed">${app.description?.substring(0, 100) || 'لا يوجد وصف'}...</p>
                
                <div class="flex items-center justify-between mb-3">
                    <span class="text-yellow-500 text-sm">
                        ${generateStarRating(app.rating)}
                        <span class="text-gray-500 text-xs mr-1">(${app.rating?.toFixed(1) || 0})</span>
                    </span>
                    <span class="text-gray-500 text-sm">
                        <i class="fas fa-download mr-1"></i>${app.downloads || 0}
                    </span>
                </div>
                
                <div class="flex items-center justify-between mb-3">
                    <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">${app.category || 'عام'}</span>
                    <span class="text-gray-500 text-xs">${formatDate(app.createdAt)}</span>
                </div>
                
                <div class="flex space-x-2 space-x-reverse">
                    <button 
                        onclick="downloadApp('${app.id}', '${app.name}')" 
                        class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                        <i class="fas fa-download mr-2"></i>تحميل
                    </button>
                    <button 
                        onclick="viewAppDetails('${app.id}')" 
                        class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <i class="fas fa-info"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// توليد تقييم النجوم
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + (halfStar ? '☆' : '') + '☆'.repeat(emptyStars);
}

// تنسيق التاريخ
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

// معالجة البحث
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (searchTerm === '') {
        filteredApps = [...allApps];
    } else {
        filteredApps = allApps.filter(app => 
            app.name.toLowerCase().includes(searchTerm) ||
            app.description.toLowerCase().includes(searchTerm) ||
            app.category.toLowerCase().includes(searchTerm)
        );
    }
    
    // عرض نتائج البحث
    if (filteredApps.length > 0) {
        displaySearchResults(filteredApps);
    } else {
        showNoResults(searchTerm);
    }
}

// عرض نتائج البحث
function displaySearchResults(apps) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('section:not(nav):not(footer)').forEach(section => {
        section.style.display = 'none';
    });
    
    // إنشاء قسم نتائج البحث
    let resultsSection = document.getElementById('searchResults');
    if (!resultsSection) {
        resultsSection = document.createElement('section');
        resultsSection.id = 'searchResults';
        resultsSection.className = 'py-16';
        resultsSection.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-8">
                    <h2 class="text-3xl font-bold text-gray-800 mb-4">نتائج البحث</h2>
                    <button onclick="clearSearch()" class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-arrow-right mr-2"></i>العودة للرئيسية
                    </button>
                </div>
                <div id="searchResultsContainer" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"></div>
            </div>
        `;
        document.querySelector('main').appendChild(resultsSection);
    }
    
    // عرض النتائج
    const container = document.getElementById('searchResultsContainer');
    displayApps(apps, 'searchResultsContainer');
}

// مسح البحث
window.clearSearch = function() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    
    // إظهار جميع الأقسام
    document.querySelectorAll('section:not(nav):not(footer)').forEach(section => {
        section.style.display = 'block';
    });
    
    // إزالة قسم نتائج البحث
    const resultsSection = document.getElementById('searchResults');
    if (resultsSection) {
        resultsSection.remove();
    }
}

// عرض رسالة عدم وجود نتائج
function showNoResults(searchTerm) {
    const resultsSection = document.getElementById('searchResults');
    if (resultsSection) {
        const container = document.getElementById('searchResultsContainer');
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-search text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-500 text-lg mb-2">لم نعثر على نتائج لـ "${searchTerm}"</p>
                <p class="text-gray-400">حاول استخدام كلمات بحث أخرى</p>
            </div>
        `;
    }
}

// التصفية حسب الفئة
function filterByCategory(category) {
    currentCategory = category;
    
    if (category === 'all') {
        filteredApps = [...allApps];
    } else {
        filteredApps = allApps.filter(app => app.category === category);
    }
    
    // عرض التطبيقات المصفاة
    displaySearchResults(filteredApps);
}

// تحميل التطبيق
window.downloadApp = async function(appId, appName) {
    try {
        // زيادة عداد التحميلات
        const appRef = doc(db, 'apps', appId);
        const app = allApps.find(a => a.id === appId);
        
        if (app) {
            await updateDoc(appRef, {
                downloads: (app.downloads || 0) + 1
            });
        }
        
        // محاكاة التحميل
        showDownloadSuccess(appName);
        
    } catch (error) {
        console.error('Error downloading app:', error);
        showError('حدث خطأ أثناء التحميل');
    }
}

// عرض تفاصيل التطبيق
window.viewAppDetails = function(appId) {
    const app = allApps.find(a => a.id === appId);
    if (app) {
        showAppModal(app);
    }
}

// عرض مودال التطبيق
function showAppModal(app) {
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b">
                    <div class="flex justify-between items-center">
                        <h3 class="text-xl font-bold text-gray-800">${app.name}</h3>
                        <button onclick="closeAppModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <div class="p-6">
                    <div class="flex flex-col md:flex-row gap-6 mb-6">
                        <img 
                            src="${app.icon || 'https://via.placeholder.com/300x200?text=No+Image'}" 
                            alt="${app.name}" 
                            class="w-full md:w-48 h-48 object-cover rounded-lg"
                        >
                        <div class="flex-1">
                            <div class="flex items-center justify-between mb-4">
                                <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">${app.category || 'عام'}</span>
                                ${app.featured ? '<span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">مميز</span>' : ''}
                            </div>
                            
                            <div class="flex items-center space-x-4 space-x-reverse mb-4">
                                <div class="flex items-center">
                                    <span class="text-yellow-500 mr-1">${generateStarRating(app.rating)}</span>
                                    <span class="text-gray-600">(${app.rating?.toFixed(1) || 0})</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-download text-gray-400 mr-1"></i>
                                    <span class="text-gray-600">${app.downloads || 0} تحميل</span>
                                </div>
                            </div>
                            
                            <button 
                                onclick="downloadApp('${app.id}', '${app.name}')" 
                                class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors mb-4"
                            >
                                <i class="fas fa-download mr-2"></i>تحميل التطبيق
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-2">الوصف</h4>
                        <p class="text-gray-600 leading-relaxed">${app.description || 'لا يوجد وصف متاح.'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // إضافة المودال إلى الصفحة
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
}

// إغلاق مودال التطبيق
window.closeAppModal = function() {
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) {
        modal.remove();
    }
}

// عرض رسالة نجاح التحميل
function showDownloadSuccess(appName) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in';
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <span>تم بدء تحميل ${appName}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // إزالة الرسالة بعد 3 ثواني
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// عرض رسالة خطأ
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in';
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // إزالة الرسالة بعد 3 ثواني
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// تصدير الدوال للاستخدام العالمي
window.filterByCategory = filterByCategory;
window.clearSearch = clearSearch;
