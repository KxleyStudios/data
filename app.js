// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAYNJ2GrVvj665KZaW6QK2X2QlfG3PexyY",
    authDomain: "data-breach-log.firebaseapp.com",
    projectId: "data-breach-log",
    storageBucket: "data-breach-log.firebasestorage.app",
    messagingSenderId: "129791211690",
    appId: "1:129791211690:web:5c0687bb2611ff047db8d3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const breachCollection = db.collection('breaches');

// DOM Elements
const breachList = document.getElementById('breachList');
const emptyState = document.getElementById('emptyState');
const addBreachModal = document.getElementById('addBreachModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const breachForm = document.getElementById('breachForm');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

// Status notification element
const statusIndicator = document.createElement('div');
statusIndicator.className = 'status-indicator';
document.body.appendChild(statusIndicator);

// Show/hide modal
openModalBtn.addEventListener('click', () => {
    addBreachModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
    addBreachModal.style.display = 'none';
});

// Close modal if clicked outside
window.addEventListener('click', (e) => {
    if (e.target === addBreachModal) {
        addBreachModal.style.display = 'none';
    }
});

// Handle form submission
breachForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newBreach = {
        username: document.getElementById('username').value,
        ipAddress: document.getElementById('ipAddress').value,
        pdfLink: document.getElementById('pdfLink').value || null,
        description: document.getElementById('description').value,
        date: new Date().toISOString()
    };
    
    try {
        await breachCollection.add(newBreach);
        showStatus('Report added successfully!', 'success');
        
        // Reset form and close modal
        breachForm.reset();
        addBreachModal.style.display = 'none';
        
        // Refresh the data
        loadBreaches();
    } catch (error) {
        console.error("Error adding document: ", error);
        showStatus('Error adding report!', 'error');
    }
});

// Search functionality
searchBtn.addEventListener('click', () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    loadBreaches(searchTerm);
});

// Also trigger search on Enter key
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const searchTerm = searchInput.value.toLowerCase().trim();
        loadBreaches(searchTerm);
    }
});

// Format date function
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show status notification
function showStatus(message, type) {
    statusIndicator.textContent = message;
    statusIndicator.className = 'status-indicator';
    
    if (type === 'success') {
        statusIndicator.classList.add('status-success');
    } else if (type === 'error') {
        statusIndicator.classList.add('status-error');
    }
    
    // Hide after 3 seconds
    setTimeout(() => {
        statusIndicator.className = 'status-indicator';
    }, 3000);
}

// Delete breach report
async function deleteBreach(id) {
    try {
        await breachCollection.doc(id).delete();
        showStatus('Report deleted successfully!', 'success');
        loadBreaches();
    } catch (error) {
        console.error("Error deleting document: ", error);
        showStatus('Error deleting report!', 'error');
    }
}

// Load breaches from Firestore
async function loadBreaches(searchTerm = '') {
    breachList.innerHTML = '';
    
    // Add loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.className = 'data-loading';
    loadingEl.textContent = 'Loading breach reports...';
    breachList.appendChild(loadingEl);
    
    try {
        // Get all breach documents
        const snapshot = await breachCollection.orderBy('date', 'desc').get();
        
        // Remove loading indicator
        breachList.removeChild(loadingEl);
        
        if (snapshot.empty) {
            breachList.appendChild(emptyState);
            return;
        }
        
        // Filter if search term provided
        let breaches = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            breaches.push(data);
        });
        
        if (searchTerm) {
            breaches = breaches.filter(breach => 
                breach.username.toLowerCase().includes(searchTerm) ||
                breach.ipAddress.toLowerCase().includes(searchTerm) ||
                breach.description.toLowerCase().includes(searchTerm)
            );
        }
        
        if (breaches.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'empty-state';
            noResults.innerHTML = `
                <h3>No matching reports found</h3>
                <p>Try another search term</p>
            `;
            breachList.appendChild(noResults);
            return;
        }
        
        // Render breach cards
        breaches.forEach(breach => {
            const card = document.createElement('div');
            card.className = 'breach-card';
            
            const formattedDate = formatDate(breach.date);
            
            card.innerHTML = `
                <button class="delete-btn" data-id="${breach.id}">&times;</button>
                <div class="breach-header">
                    <div>
                        <span class="tag">Breach</span>
                        <span class="breach-title">${breach.username}</span>
                    </div>
                    <span class="breach-date">${formattedDate}</span>
                </div>
                <div class="breach-details">
                    <div class="detail-item">
                        <span class="detail-label">IP ADDRESS</span>
                        <span class="detail-value">${breach.ipAddress}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">CHATLOG</span>
                        <span class="detail-value">
                            ${breach.pdfLink ? 
                                `<a href="${breach.pdfLink}" class="pdf-link" target="_blank">View PDF</a>` : 
                                'No PDF available'}
                        </span>
                    </div>
                </div>
                <div class="breach-description">${breach.description}</div>
                <div class="timestamp">Document ID: ${breach.id}</div>
            `;
            
            breachList.appendChild(card);
            
            // Add delete event listener
            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this report?')) {
                    deleteBreach(breach.id);
                }
            });
        });
        
    } catch (error) {
        console.error("Error loading documents: ", error);
        
        // Remove loading indicator
        if (breachList.contains(loadingEl)) {
            breachList.removeChild(loadingEl);
        }
        
        // Show error
        const errorEl = document.createElement('div');
        errorEl.className = 'empty-state';
        errorEl.innerHTML = `
            <h3>Error loading data</h3>
            <p>Please check your Firebase configuration</p>
        `;
        breachList.appendChild(errorEl);
    }
}

// Initial data load
document.addEventListener('DOMContentLoaded', () => {
    loadBreaches();
});