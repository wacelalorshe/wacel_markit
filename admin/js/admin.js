import { 
    db, 
    storage,
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot,
    query,
    where,
    orderBy,
    ref, 
    uploadBytes, 
    getDownloadURL,
    deleteObject 
} from '../public/js/firebase-config.js';

// حالة التطبيق
let allApps = [];
let currentEditingId = null;
let currentPage = 1;
const appsPerPage = 10;

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
    setupEventListeners();
    loadApps();
});

// تهيئة لوحة التحكم
function initializeAdmin() {
    // تفعيل القسم الافتراضي
    showSection('dashboard');
    
    // تحديث العنوان
    updatePageTitle('الإحصائيات');
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // التنقل بين الأقسام
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // تحديث العنصر النشط
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // تحديث العنوان
            updatePageTitle(this.textContent.trim());
        });
    });
    
    // زر إضافة تطبيق
    const addAppBtn = document.getElementById('addAppBtn');
    if (addAppBtn) {
        addAppBtn.addEventListener('click', function() {
            openModal();
        });
    }
    
    // البحث في التطبيقات
    const appSearch = document.getElementById('appSearch');
    if (appSearch) {
        appSearch.addEventListener('input', filterApps);
    }
    
    // تصفية الفئات
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterApps);
    }
    
    // معاينة الصورة
    const iconInput = document.getElementById('iconInput');
    if (iconInput) {
        iconInput.addEventListener('change', handleImagePreview);
    }
    
    // النماذج
    const appForm = document.getElementById('appForm');
    if (appForm) {
        appForm.addEventListener('submit', handleFormSubmit);
    }
    
    // التصفح بين الصفحات
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    
    if (prevPage) prevPage.addEventListener('click', goToPrevPage);
    if (nextPage) nextPage.addEventListener('click', goToNextPage);
}

// عرض قسم معين
function showSection(sectionId) {
    // إخفاء جميع الأقسام
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
        section.classList.add('hidden');
    });
    
    // إظهار القسم المطلوب
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.classList.remove('hidden');
    }
    
    // تحميل بيانات إضافية حسب القسم
    if (sectionId === 'dashboard') {
        updateDashboardStats();
    }
}

// تحديث عنوان الصفحة
function updatePageTitle(title) {
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = title;
    }
}

// تحميل التطبيقات من Firebase
function loadApps() {
    const appsRef = collection(db, 'apps');
    const q = query(appsRef, orderBy('createdAt', 'desc'));
    
    onSnapshot(q, (snapshot) => {
        allApps = [];
        snapshot.forEach(doc => {
            const appData = doc.data();
            allApps.push({ 
                id: doc.id, 
                ...appData,
                createdAt: appData.createdAt || new Date().toISOString(),
                downloads: appData.downloads || 0,
                rating: appData.rating || 0,
                featured: appData.featured || false
            });
        });
        
        // تحديث الواجهة
        updateAppsTable();
        updateDashboardStats();
    }, (error) => {
        console.error('Error loading apps:', error);
        showToast('حدث خطأ في تحميل التطبيقات', 'error');
    });
}

// تحديث جدول التطبيقات
function updateAppsTable(filteredApps = null) {
    const appsToDisplay = filteredApps || allApps;
    const tbody = document.getElementById('appsTableBody');
    const showingCount = document.getElementById('showingCount');
    const totalCount = document.getElementById('totalCount');
    
    if (!tbody) return;
    
    // تحديث العداد
    if (showingCount) showingCount.textContent = appsToDisplay.length;
    if (totalCount) totalCount.textContent = allApps.length;
    
    if (appsToDisplay.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-4"></i>
                    <p>لا توجد تطبيقات لعرضها</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // التقسيم للصفحات
    const startIndex = (currentPage - 1) * appsPerPage;
    const endIndex = startIndex + appsPerPage;
    const paginatedApps = appsToDisplay.slice(startIndex, endIndex);
    
    tbody.innerHTML = paginatedApps.map(app => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <img src="${app.icon || 'https://via.placeholder.com/40x40?text=No+Image'}" 
                         alt="${app.name}" 
                         class="w-10 h-10 rounded-lg object-cover mr-3"
                         onerror="this.src='https://via.placeholder.com/40x40?text=No+Image'">
                    <div>
                        <div class="font-medium text-gray-900">${app.name}</div>
                        <div class="text-sm text-gray-500 truncate max-w-xs">${app.description?.substring(0, 50) || 'لا يوجد وصف'}...</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">${app.category || 'عام'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <span class="text-yellow-500 mr-1">★</span>
                    <span class="text-gray-700">${app.rating?.toFixed(1) || 0}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-gray-700">${app.downloads || 0}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">نشط</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2 space-x-reverse">
                    <button onclick="editApp('${app.id}')" 
                            class="text-blue-600 hover:text-blue-900 transition-colors"
                            title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="toggleFeatured('${app.id}', ${!app.featured})" 
                            class="${app.featured ? 'text-yellow-600 hover:text-yellow-900' : 'text-gray-600 hover:text-gray-900'} transition-colors"
                            title="${app.featured ? 'إلغاء التميز' : 'تعيين كمميز'}">
                        <i class="fas fa-star"></i>
                    </button>
                    <button onclick="deleteApp('${app.id}')" 
                            class="text-red-600 hover:text-red-900 transition-colors"
                            title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // تحديث أزرار الصفحات
    updatePaginationButtons(appsToDisplay.length);
}

// تصفية التطبيقات
function filterApps() {
    const searchTerm = document.getElementById('appSearch')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
    
    let filtered = allApps;
    
    // التصفية حسب البحث
    if (searchTerm) {
        filtered = filtered.filter(app => 
            app.name.toLowerCase().includes(searchTerm) ||
            app.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // التصفية حسب الفئة
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(app => app.category === categoryFilter);
    }
    
    // إعادة تعيين الصفحة الحالية
    currentPage = 1;
    
    // تحديث الجدول
    updateAppsTable(filtered);
}

// تحديث أزرار الصفحات
function updatePaginationButtons(totalApps) {
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const totalPages = Math.ceil(totalApps / appsPerPage);
    
    if (prevPage) {
        prevPage.disabled = currentPage === 1;
        prevPage.classList.toggle('opacity-50', currentPage === 1);
        prevPage.classList.toggle('cursor-not-allowed', currentPage === 1);
    }
    
    if (nextPage) {
        nextPage.disabled = currentPage === totalPages;
        nextPage.classList.toggle('opacity-50', currentPage === totalPages);
        nextPage.classList.toggle('cursor-not-allowed', currentPage === totalPages);
    }
}

// الانتقال للصفحة السابقة
function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        updateAppsTable();
    }
}

// الانتقال للصفحة التالية
function goToNextPage() {
    const totalPages = Math.ceil(allApps.length / appsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        updateAppsTable();
    }
}

// فتح المودال
window.openModal = function(app = null) {
    const modal = document.getElementById('appModal');
    const form = document.getElementById('appForm');
    const modalTitle = document.getElementById('modalTitle');
    
    if (app) {
        // وضع التعديل
        currentEditingId = app.id;
        modalTitle.textContent = 'تعديل التطبيق';
        
        // تعبئة النموذج
        form.name.value = app.name || '';
        form.category.value = app.category || '';
        form.description.value = app.description || '';
        form.downloadUrl.value = app.downloadUrl || '';
        form.rating.value = app.rating || 0;
        form.downloads.value = app.downloads || 0;
        form.featured.checked = app.featured || false;
        
        // عرض معاينة الصورة
        if (app.icon) {
            const preview = document.getElementById('imagePreview');
            const previewImage = document.getElementById('previewImage');
            preview.classList.remove('hidden');
            previewImage.src = app.icon;
        }
    } else {
        // وضع الإضافة
        currentEditingId = null;
        modalTitle.textContent = 'إضافة تطبيق جديد';
        form.reset();
        document.getElementById('imagePreview').classList.add('hidden');
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// إغلاق المودال
window.closeModal = function() {
    const modal = document.getElementById('appModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // إعادة تعيين النموذج
    document.getElementById('appForm').reset();
    document.getElementById('imagePreview').classList.add('hidden');
    currentEditingId = null;
}

// معاينة الصورة
function handleImagePreview(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.classList.remove('hidden');
            previewImage.src = e.target.result;
        }
        reader.readAsDataURL(file);
    } else {
        preview.classList.add('hidden');
    }
}

// رفع الصورة إلى Storage
async function uploadImage(file) {
    try {
        const storageRef = ref(storage, `app-icons/${Date.now()}-${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('فشل في رفع الصورة');
    }
}

// معالجة تقديم النموذج
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    // تعطيل الزر أثناء الحفظ
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>جاري الحفظ...';
    
    try {
        const appData = {
            name: formData.get('name'),
            category: formData.get('category'),
            description: formData.get('description'),
            downloadUrl: formData.get('downloadUrl'),
            rating: parseFloat(formData.get('rating')) || 0,
            downloads: parseInt(formData.get('downloads')) || 0,
            featured: formData.get('featured') === 'on',
            updatedAt: new Date().toISOString()
        };
        
        // إذا كان جديداً، أضف تاريخ الإنشاء
        if (!currentEditingId) {
            appData.createdAt = new Date().toISOString();
        }
        
        // رفع الصورة إذا كانت موجودة
        const iconFile = formData.get('icon');
        if (iconFile && iconFile.size > 0) {
            appData.icon = await uploadImage(iconFile);
        } else if (currentEditingId && !iconFile.size) {
            // احتفظ بالصورة الحالية إذا لم يتم رفع صورة جديدة
            const currentApp = allApps.find(app => app.id === currentEditingId);
            if (currentApp) {
                appData.icon = currentApp.icon;
            }
        }
        
        if (currentEditingId) {
            // تحديث التطبيق
            await updateDoc(doc(db, 'apps', currentEditingId), appData);
            showToast('تم تحديث التطبيق بنجاح', 'success');
        } else {
            // إضافة تطبيق جديد
            await addDoc(collection(db, 'apps'), appData);
            showToast('تم إضافة التطبيق بنجاح', 'success');
        }
        
        closeModal();
        
    } catch (error) {
        console.error('Error saving app:', error);
        showToast('حدث خطأ أثناء حفظ التطبيق', 'error');
    } finally {
        // إعادة تمكين الزر
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-save mr-2"></i>حفظ';
    }
}

// تعديل التطبيق
window.editApp = function(appId) {
    const app = allApps.find(a => a.id === appId);
    if (app) {
        openModal(app);
    }
}

// تبديل حالة التميز
window.toggleFeatured = async function(appId, featured) {
    try {
        await updateDoc(doc(db, 'apps', appId), {
            featured: featured,
            updatedAt: new Date().toISOString()
        });
        
        showToast(featured ? 'تم تعيين التطبيق كمميز' : 'تم إلغاء تميز التطبيق', 'success');
    } catch (error) {
        console.error('Error toggling featured:', error);
        showToast('حدث خطأ أثناء تحديث التطبيق', 'error');
    }
}

// حذف التطبيق
window.deleteApp = async function(appId) {
    const app = allApps.find(a => a.id === appId);
    
    if (!app) return;
    
    if (!confirm(`هل أنت متأكد من حذف التطبيق "${app.name}"؟`)) {
        return;
    }
    
    try {
        // حذف الصورة من Storage إذا كانت موجودة
        if (app.icon && app.icon.includes('firebasestorage')) {
            try {
                const imageRef = ref(storage, app.icon);
                await deleteObject(imageRef);
            } catch (storageError) {
                console.warn('Could not delete image from storage:', storageError);
            }
        }
        
        // حذف التطبيق من Firestore
        await deleteDoc(doc(db, 'apps', appId));
        
        showToast('تم حذف التطبيق بنجاح', 'success');
    } catch (error) {
        console.error('Error deleting app:', error);
        showToast('حدث خطأ أثناء حذف التطبيق', 'error');
    }
}

// تحديث إحصائيات لوحة التحكم
function updateDashboardStats() {
    const totalApps = document.getElementById('totalApps');
    const totalDownloads = document.getElementById('totalDownloads');
    const averageRating = document.getElementById('averageRating');
    
    if (totalApps) totalApps.textContent = allApps.length;
    
    if (totalDownloads) {
        const total = allApps.reduce((sum, app) => sum + (app.downloads || 0), 0);
        totalDownloads.textContent = total.toLocaleString();
    }
    
    if (averageRating) {
        const avg = allApps.length > 0 ? 
            allApps.reduce((sum, app) => sum + (app.rating || 0), 0) / allApps.length : 0;
        averageRating.textContent = avg.toFixed(1);
    }
    
    // تحديث التطبيقات الحديثة
    updateRecentApps();
}

// تحديث التطبيقات الحديثة
function updateRecentApps() {
    const recentAppsContainer = document.getElementById('recentApps');
    if (!recentAppsContainer) return;
    
    const recentApps = allApps
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    
    if (recentApps.length === 0) {
        recentAppsContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-mobile-alt text-4xl mb-2"></i>
                <p>لا توجد تطبي
