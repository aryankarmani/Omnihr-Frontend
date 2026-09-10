import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Calendar, FileText, Info, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { createPortal } from 'react-dom';

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
                            className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 hover:bg-brand-500 text-brand-600 dark:text-brand-400 hover:text-white rounded-xl font-bold transition-all border border-brand-500/20"
                        >
                        <Check size={16} />
                        <span>Mark all read</span>
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-[#12151C] p-3.5 rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-2">
                        <input 
                            type="checkbox" 
                            checked={selectedIds.length > 0 && selectedIds.length === filteredNotifications.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-gray-300 text-[#2C4FD6] focus:ring-[#2C4FD6] cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-[#5B6472] dark:text-gray-400">Select All</span>
                    </div>
                    <div className="h-5 w-px bg-[#E2E6ED] dark:bg-gray-800 hidden md:block"></div>
                    <div className="flex bg-[#F7F8FA] dark:bg-white/5 p-1 rounded-[8px] border border-[#E2E6ED] dark:border-gray-800">
                        <button 
                            onClick={() => setActiveTab('all')}
                            className={`px-3 py-1 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${activeTab === 'all' ? 'bg-white dark:bg-[#12151C] text-[#2C4FD6] dark:text-white' : 'text-[#717E95] hover:text-[#12151C]'}`}
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setActiveTab('unread')}
                            className={`px-3 py-1 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${activeTab === 'unread' ? 'bg-white dark:bg-[#12151C] text-[#2C4FD6] dark:text-white' : 'text-[#717E95] hover:text-[#12151C]'}`}
                        >
                            Unread
                        </button>
                    </div>
                </div>
                <div className="relative w-full max-w-[340px] group">
                    <div className="relative flex items-center search">
                        <Search size={15} className="absolute left-3 text-[#9AA3B1] group-focus-within:text-[#2C4FD6] transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search through alerts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-[9px] h-[36px] bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] outline-none focus:border-[#2C4FD6] transition-all text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                        />
                    </div>
                </div>
            </div>

            {/* Notifications List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#12151C] rounded-[11px] border border-[#E2E6ED] dark:border-gray-800">
                    <Loader2 className="w-8 h-8 text-[#2C4FD6] animate-spin mb-3" />
                    <p className="text-[#5B6472] dark:text-gray-400 text-xs font-semibold">Syncing notifications...</p>
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#12151C] rounded-[11px] border border-[#E2E6ED] dark:border-gray-800">
                    <div className="w-14 h-14 bg-[#F7F8FA] dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-[#9AA3B1]">
                        <Bell size={28} />
                    </div>
                    <h3 className="text-base font-bold text-[#12151C] dark:text-white">All Clear!</h3>
                    <p className="text-[#717E95] dark:text-gray-400 mt-1 font-normal text-xs">You don't have any notifications right now.</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filteredNotifications.map((n) => (
                       <div 
                            key={n.id}
                            onClick={() => {
                                if (n.unread) {
                                    markAsRead(n.id);
                                }
                            }}
                            className={`group relative p-3.5 rounded-[8px] border transition-all ${
                               n.unread 
                                ? 'bg-white dark:bg-[#12151C] border-[#E2E6ED] dark:border-gray-800'
                                : 'bg-[#F7F8FA] dark:bg-gray-800/40 border-[#E2E6ED] dark:border-gray-800'
                            } ${selectedIds.includes(n.id) ? 'ring-2 ring-[#2C4FD6]' : ''}`}
                        >
                            <div className="flex gap-3.5 items-center">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.includes(n.id)}
                                    onChange={() => toggleSelect(n.id)}
                                    className="w-4 h-4 rounded border-gray-300 text-[#2C4FD6] focus:ring-[#2C4FD6] cursor-pointer"
                                />
                                <div className={`w-9 h-9 rounded-[7px] flex items-center justify-center shrink-0 ${
                                    n.type === 'leave' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                    n.type === 'attendance' ? 'bg-rose-500/10 text-[#DE350B]' :
                                    'bg-[#E8ECFC] text-[#2C4FD6] dark:bg-blue-500/20 dark:text-blue-400'
                                }`}>
                                    {n.type === 'leave' ? <FileText size={18} /> :
                                     n.type === 'attendance' ? <Calendar size={18} /> :
                                     <Info size={18} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`text-[13.5px] font-semibold ${n.unread ? 'text-[#12151C] dark:text-white' : 'text-[#5B6472] dark:text-gray-300'}`}>
                                                {n.title}
                                            </h3>
                                            {n.unread && (
                                                <span className="px-[6px] py-[1.5px] bg-[#2C4FD6] text-white text-[9px] font-bold rounded-full uppercase tracking-wider">NEW</span>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-[#9AA3B1] font-mono-numbers">{n.time}</span>
                                    </div>
                                    <p className={`text-xs font-normal leading-relaxed break-all ${n.unread ? 'text-[#12151C] dark:text-gray-200' : 'text-[#717E95] dark:text-gray-400'}`}>
                                        {n.message}
                                    </p>
                                </div>
                               
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Deletion Modal */}
            {showDeleteModal && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-[#12151C] rounded-[11px] p-6 max-w-sm w-full border border-[#E2E6ED] dark:border-gray-800 animate-scale-in text-center">
                        <div className="w-12 h-12 bg-[#FBE7E7] dark:bg-rose-500/20 rounded-full flex items-center justify-center mb-3 text-[#DE350B] mx-auto">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-base font-bold text-[#12151C] dark:text-white mb-1">Delete Notifications?</h3>
                        <p className="text-xs text-[#5B6472] dark:text-gray-400 mb-5 font-normal">
                            Are you sure you want to delete {selectedIds.length} notification{selectedIds.length > 1 ? 's' : ''}? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-2.5 rounded-[8px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 font-semibold text-[13.5px] hover:bg-gray-50 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={deleteNotifications}
                                className="flex-1 py-2.5 rounded-[8px] bg-[#DE350B] hover:bg-[#b02a08] text-white font-semibold text-[13.5px] transition-all cursor-pointer"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
