


import React, { useState, useEffect } from 'react';
import { AppChangeLogItem, ChangeType } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface AddChangeModalProps {
    onCreate: (newChange: Omit<AppChangeLogItem, 'id' | 'status' | 'addendum_name'>) => void;
    onClose: () => void;
    defaultType: 'specs' | 'drawings';
}

const AddChangeModal = ({ onCreate, onClose, defaultType }: AddChangeModalProps) => {
    const [newChange, setNewChange] = useState<Omit<AppChangeLogItem, 'id'|'status'|'addendum_name'>>({
        change_type: ChangeType.TEXT_REPLACE,
        description: '',
        location_hint: '',
        source_page: 1,
        source_original_document: defaultType,
    });

    const handleCreate = () => {
        if(!newChange.description) {
            alert("Description is a required field.");
            return;
        }
        onCreate(newChange);
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isNumeric = ['source_page', 'original_page_number', 'target_page_number', 'insert_after_original_page_number'].includes(name);

        setNewChange(prev => ({ 
            ...prev, 
            [name]: isNumeric ? (value === '' ? undefined : parseInt(value, 10)) : value
        }));
    };
    
    useEffect(() => {
        // Reset fields when change type changes to avoid keeping irrelevant data
        setNewChange(prev => ({
            change_type: prev.change_type,
            description: prev.description,
            source_page: prev.source_page,
            location_hint: prev.location_hint,
            source_original_document: prev.source_original_document
        }));
    }, [newChange.change_type]);


    const handleDialogClick = (e: React.MouseEvent) => e.stopPropagation();

    const renderFieldsForType = () => {
        const type = newChange.change_type;
        const isPageChange = type.startsWith('PAGE_');
        const isTextChange = type.startsWith('TEXT_');

        return (
            <>
                {isTextChange && (
                    <>
                        <InputField label="Original Document Page Number" name="original_page_number" type="number" value={newChange.original_page_number} onChange={handleChange} />
                        {(type === ChangeType.TEXT_DELETE || type === ChangeType.TEXT_REPLACE) && (
                            <TextareaField label="Original Text to Find" name="exact_text_to_find" value={newChange.exact_text_to_find} onChange={handleChange} />
                        )}
                        {(type === ChangeType.TEXT_ADD || type === ChangeType.TEXT_REPLACE) && (
                             <TextareaField label="New/Replacement Text" name="new_text_to_insert" value={newChange.new_text_to_insert} onChange={handleChange} />
                        )}
                    </>
                )}
                {isPageChange && (
                    <>
                        {(type === ChangeType.PAGE_REPLACE || type === ChangeType.PAGE_DELETE) && (
                           <InputField label="Original Page to Affect" name="target_page_number" type="number" value={newChange.target_page_number} onChange={handleChange} />
                        )}
                        {(type === ChangeType.PAGE_REPLACE || type === ChangeType.PAGE_ADD) && (
                            <InputField label="Addendum Source Page" name="source_page" type="number" value={newChange.source_page} onChange={handleChange} />
                        )}
                         {type === ChangeType.PAGE_ADD && (
                             <InputField label="Insert After Original Page" name="insert_after_original_page_number" type="number" value={newChange.insert_after_original_page_number} onChange={handleChange} placeholder="0 for start of doc"/>
                        )}
                    </>
                )}
            </>
        )
    }

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
                    <h3 className="text-lg font-bold text-slate-800">Add Manual Change to <span className="capitalize text-brand-600">{newChange.source_original_document}</span></h3>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                     <div>
                        <label htmlFor="change_type" className="block text-sm font-semibold text-slate-700 mb-1">Change Type</label>
                        <select
                            id="change_type"
                            name="change_type"
                            value={newChange.change_type}
                            onChange={handleChange}
                            className="w-full text-sm p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition bg-white"
                        >
                            {Object.values(ChangeType).map(type => (
                                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>

                    <TextareaField label="Description (Required)" name="description" value={newChange.description} onChange={handleChange} rows={2}/>
                    <InputField label="Location Hint (Sheet or Spec Section)" name="location_hint" value={newChange.location_hint} onChange={handleChange} />
                    
                    {renderFieldsForType()}
                </div>

                <div className="flex justify-end items-center p-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                    <div className="flex space-x-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition">Cancel</button>
                        <button onClick={handleCreate} className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-md shadow-sm transition">Create Change</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InputField = ({ label, name, value, onChange, type = 'text', placeholder = '' }: {label:string, name:string, value?:string|number, onChange: any, type?:string, placeholder?:string}) => (
    <div>
        <label htmlFor={name} className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
        <input
            id={name}
            name={name}
            type={type}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full text-sm p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
        />
    </div>
);

const TextareaField = ({ label, name, value, onChange, rows = 3 }: {label:string, name:string, value?:string, onChange: any, rows?:number}) => (
    <div>
        <label htmlFor={name} className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
        <textarea
            id={name}
            name={name}
            value={value || ''}
            onChange={onChange}
            rows={rows}
            className="w-full text-sm p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
        />
    </div>
);


export default AddChangeModal;