
import React, { useState, useEffect } from 'react';
import { AppChangeLogItem, ChangeType } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface EditChangeModalProps {
    change: AppChangeLogItem;
    onSave: (id: number, updatedChange: AppChangeLogItem) => void;
    onClose: () => void;
}

const EditChangeModal = ({ change, onSave, onClose }: EditChangeModalProps) => {
    const [editedChange, setEditedChange] = useState(change);

    useEffect(() => {
        setEditedChange(change);
    }, [change]);

    const handleSave = () => {
        onSave(editedChange.id, editedChange);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'due_date') {
            setEditedChange(prev => ({ 
                ...prev, 
                due_date: value ? new Date(value).getTime() : undefined 
            }));
            return;
        }
        setEditedChange(prev => ({ ...prev, [name]: value }));
    };

    const handleDialogClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all"
                onClick={handleDialogClick}
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">Edit Change Details</h3>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={editedChange.description}
                            onChange={handleChange}
                            rows={2}
                            className="w-full text-sm p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                        />
                    </div>

                    <div>
                        <label htmlFor="due_date" className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                        <input
                            id="due_date"
                            name="due_date"
                            type="date"
                            value={editedChange.due_date ? new Date(editedChange.due_date).toISOString().split('T')[0] : ''}
                            onChange={handleChange}
                            className="w-full text-sm p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                        />
                    </div>

                    {(change.change_type === ChangeType.TEXT_REPLACE || change.change_type === ChangeType.TEXT_DELETE) && editedChange.exact_text_to_find !== undefined && (
                        <div>
                            <label htmlFor="exact_text_to_find" className="block text-sm font-semibold text-slate-700 mb-1">Original Text to Find</label>
                            <textarea
                                id="exact_text_to_find"
                                name="exact_text_to_find"
                                value={editedChange.exact_text_to_find}
                                onChange={handleChange}
                                rows={3}
                                className="w-full text-sm p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                            />
                        </div>
                    )}
                    {(change.change_type === ChangeType.TEXT_REPLACE || change.change_type === ChangeType.TEXT_ADD) && editedChange.new_text_to_insert !== undefined && (
                         <div>
                            <label htmlFor="new_text_to_insert" className="block text-sm font-semibold text-slate-700 mb-1">New/Replacement Text</label>
                            <textarea
                                id="new_text_to_insert"
                                name="new_text_to_insert"
                                value={editedChange.new_text_to_insert}
                                onChange={handleChange}
                                rows={3}
                                className="w-full text-sm p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-end items-center p-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                    <div className="flex space-x-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-md shadow-sm transition">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditChangeModal;
