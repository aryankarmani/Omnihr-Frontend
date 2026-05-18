import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Calendar, FileText, Info, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function Notifications() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const fetchNotifications = async () => {
        setLoading(true);
       
           
  try {
    const res = await api.get('/notifications');
     setNotifications(Array.isArray(res.data) ? res.data : []);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    toast.error('Failed to load notifications');
    setNotifications([]);
  } finally {
    setLoading(false);
  }
};

          

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
        } catch (e) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
        }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
            toast.success('All marked as read');
        } catch (e) {
            setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
        }
    };

    const deleteNotifications = async () => {
        const idsToDelete = selectedIds.length > 0 ? selectedIds : [];
        if (idsToDelete.length === 0) return;

        try {
            await api.post('/notifications/delete-bulk', { ids: idsToDelete });
            setNotifications(prev => prev.filter(n => !idsToDelete.includes(n.id)));
            setSelectedIds([]);
            setShowDeleteModal(false);
            toast.success(`${idsToDelete.length} notifications deleted`);
        } catch (e) {
            setNotifications(prev => prev.filter(n => !idsToDelete.includes(n.id)));
            setSelectedIds([]);
            setShowDeleteModal(false);
            toast.success('Deleted successfully');
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        const filtered = filteredNotifications.map(n => n.id);
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered);
        }
    };

    const filteredNotifications = notifications.filter(n => {
        const matchesTab = activeTab === 'all' || n.unread;
        const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             n.message.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="animate-fade-in-up w-full px-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Notifications</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Manage your system alerts and history</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <button 
                            onClick={() => setShowDeleteModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-500/20"
                        >
                            <Trash2 size={16} />
                            <span>Delete ({selectedIds.length})</span>
                        </button>
                    )}
                    <button 
                        onClick={markAllRead}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 hover:bg-brand-500 text-brand-600 dark:text-brand-400 hover:text-white rounded-xl font-bold transition-all border border-brand-500/20 shadow-sm"
                    >
                        <Check size={16} />
                        <span>Mark all read</span>
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-brand-900 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-3">
                        <input 
                            type="checkbox" 
                            checked={selectedIds.length > 0 && selectedIds.length === filteredNotifications.length}
                            onChange={toggleSelectAll}
                            className="w-5 h-5 rounded-lg border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                        />
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Select All</span>
                    </div>
                    <div className="h-6 w-px bg-gray-100 dark:bg-white/10 hidden md:block"></div>
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-white dark:bg-brand-500 text-brand-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setActiveTab('unread')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'unread' ? 'bg-white dark:bg-brand-500 text-brand-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Unread
                        </button>
                    </div>
                </div>
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search through alerts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-gray-800 dark:text-white font-medium"
                    />
                </div>
            </div>

            {/* Notifications List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5">
                    <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-bold">Syncing notifications...</p>
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-24 bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 text-gray-300">
                        <Bell size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white">All Clear!</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">You don't have any notifications right now.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredNotifications.map((n) => (
                        <div 
                            key={n.id}
                            className={`group relative p-4 rounded-2xl border transition-all hover:border-brand-500/30 ${
                                n.unread 
                                ? 'bg-brand-50/50 dark:bg-brand-500/5 border-brand-100 dark:border-brand-500/20' 
                                : 'bg-white dark:bg-brand-900 border-gray-100 dark:border-white/5'
                            } ${selectedIds.includes(n.id) ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-brand-950' : ''}`}
                        >
                            <div className="flex gap-5 items-center">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.includes(n.id)}
                                    onChange={() => toggleSelect(n.id)}
                                    className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                                />
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                    n.type === 'leave' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
                                    n.type === 'attendance' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' :
                                    'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
                                }`}>
                                    {n.type === 'leave' ? <FileText size={24} /> :
                                     n.type === 'attendance' ? <Calendar size={24} /> :
                                     <Info size={24} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className={`text-base font-black tracking-tight ${n.unread ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                {n.title}
                                            </h3>
                                            {n.unread && (
                                                <span className="px-2 py-0.5 bg-brand-500 text-white text-[9px] font-black rounded-full uppercase">NEW</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{n.time}</span>
                                    </div>
                                    <p className={`text-sm leading-relaxed ${n.unread ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {n.message}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                    {n.unread && (
                                        <button 
                                            onClick={() => markAsRead(n.id)}
                                            className="p-2 text-brand-500 hover:bg-brand-500/10 rounded-lg transition-all"
                                            title="Mark as read"
                                        >
                                            <Check size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Deletion Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-brand-900 rounded-[2.5rem] p-8 max-w-md w-full border border-gray-100 dark:border-white/10 shadow-2xl animate-scale-in">
                        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/20 rounded-2xl flex items-center justify-center mb-6 text-rose-500 mx-auto">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white text-center mb-2">Delete Notifications?</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-center mb-8 font-medium">
                            Are you sure you want to delete {selectedIds.length} notification{selectedIds.length > 1 ? 's' : ''}? This action cannot be undone.
                        </p>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3 px-6 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={deleteNotifications}
                                className="flex-1 py-3 px-6 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-500/25 uppercase tracking-widest text-xs"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
