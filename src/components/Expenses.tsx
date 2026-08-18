import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  X,
  PlusCircle,
  Tag,
  AlertTriangle,
  Minus,
  CheckCircle,
  Warehouse
} from 'lucide-react';
import { Expense, ExpenseCategory, InventoryItem } from '../types';
import { dbExpenses, dbInventory } from '../services/dbService';
import { useToast } from './Toast';

interface ExpensesProps {
  expenses: Expense[];
  inventory: InventoryItem[];
  initialSubTab?: 'ledger' | 'stock';
}

export default function Expenses({ expenses, inventory, initialSubTab = 'ledger' }: ExpensesProps) {
  const { showSuccess, showError } = useToast();
  const [subTab, setSubTab] = useState<'ledger' | 'stock'>(initialSubTab);
  
  // Expense Ledger State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Expense Form State
  const [category, setCategory] = useState<ExpenseCategory>('misc');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Stock State
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  // Stock Form State
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [minThreshold, setMinThreshold] = useState<number>(5);
  const [unit, setUnit] = useState('sheets');
  const [rate, setRate] = useState<number>(0);
  const [isStockSubmitting, setIsStockSubmitting] = useState(false);
  const [isDeletingStock, setIsDeletingStock] = useState<string | null>(null);
  const [stockErrorMsg, setStockErrorMsg] = useState('');

  // Editing Rate inline state
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editingRateValue, setEditingRateValue] = useState<string>('');

  // Handle open modal for stock
  const handleOpenStockCreate = () => {
    setItemName('');
    setQuantity(0);
    setMinThreshold(5);
    setUnit('sheets');
    setRate(0);
    setStockErrorMsg('');
    setIsStockModalOpen(true);
  };

  // Submit Inventory Form
  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStockSubmitting) return; // Prevent duplicate submits

    if (!itemName.trim() || !unit.trim()) {
      setStockErrorMsg('Item name and units are required.');
      return;
    }

    setIsStockSubmitting(true);
    setStockErrorMsg('');

    try {
      await dbInventory.add({
        itemName: itemName.trim(),
        quantity,
        minThreshold,
        unit: unit.trim(),
        rate,
      });
      showSuccess(`Inventory item "${itemName.trim()}" added successfully.`);
      
      // On success, reset form fields and close dialog
      setItemName('');
      setQuantity(0);
      setMinThreshold(5);
      setUnit('sheets');
      setRate(0);
      setIsStockModalOpen(false);
    } catch (error: any) {
      console.error('Firebase stock submit error:', error);
      const msg = error?.message || 'Failed to add item. Try again.';
      setStockErrorMsg(msg);
      showError(msg);
    } finally {
      setIsStockSubmitting(false);
    }
  };

  // Delete inventory item
  const handleStockDelete = async (id: string) => {
    if (isDeletingStock) return; // Prevent duplicate deleting
    const targetItem = inventory.find(item => item.id === id);
    const label = targetItem ? `item "${targetItem.itemName}"` : 'this item';

    if (confirm(`Are you sure you want to remove ${label} from inventory tracking?`)) {
      setIsDeletingStock(id);
      try {
        await dbInventory.delete(id);
        showSuccess(`Removed ${label} successfully.`);
      } catch (error: any) {
        console.error('Delete stock item error:', error);
        showError(error?.message || 'Failed to remove inventory item.');
      } finally {
        setIsDeletingStock(null);
      }
    }
  };

  // Quick increment / decrement stock level
  const handleQuantityAdjust = async (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    try {
      await dbInventory.update(item.id, { quantity: newQty });
      showSuccess(`Adjusted ${item.itemName} quantity to ${newQty}.`);
    } catch (error: any) {
      console.error('Adjust stock error:', error);
      showError(error?.message || 'Failed to adjust stock level.');
    }
  };

  // Save inline edited rate
  const handleSaveRate = async (id: string) => {
    const numericRate = parseFloat(editingRateValue);
    if (isNaN(numericRate) || numericRate < 0) {
      showError('Please enter a valid rate.');
      return;
    }
    try {
      await dbInventory.update(id, { rate: numericRate });
      showSuccess('Material rate updated successfully.');
    } catch (error: any) {
      console.error('Update rate error:', error);
      showError(error?.message || 'Failed to update rate.');
    } finally {
      setEditingRateId(null);
    }
  };

  // Searching filter for inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      return item.itemName.toLowerCase().includes(stockSearchQuery.toLowerCase());
    });
  }, [inventory, stockSearchQuery]);

  // Calculations for KPI
  const totals = useMemo(() => {
    let rent = 0;
    let electricity = 0;
    let materials = 0;
    let labor = 0;
    let misc = 0;

    expenses.forEach(exp => {
      switch (exp.category) {
        case 'rent':
          rent += exp.amount;
          break;
        case 'electricity':
          electricity += exp.amount;
          break;
        case 'materials':
          materials += exp.amount;
          break;
        case 'labor':
          labor += exp.amount;
          break;
        case 'misc':
          misc += exp.amount;
          break;
      }
    });

    const grandTotal = rent + electricity + materials + labor + misc;

    return { rent, electricity, materials, labor, misc, grandTotal };
  }, [expenses]);

  // Handle open modal
  const handleOpenCreate = () => {
    setCategory('misc');
    setDescription('');
    setAmount(0);
    setDate(new Date().toISOString().split('T')[0]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Submit Expense Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submits

    if (amount <= 0) {
      setErrorMsg('Expense amount must be greater than ₹0.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await dbExpenses.add({
        category,
        description: description.trim() || undefined,
        amount,
        date,
      });
      showSuccess(`Successfully logged ₹${amount.toLocaleString('en-IN')} expense.`);

      // Reset form fields on success
      setCategory('misc');
      setDescription('');
      setAmount(0);
      setDate(new Date().toISOString().split('T')[0]);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Log expense error:', error);
      const msg = error?.message || 'Failed to log expense. Try again.';
      setErrorMsg(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Expense
  const handleDelete = async (id: string) => {
    if (isDeletingExpense) return; // Prevent duplicate deletes
    const targetExp = expenses.find(exp => exp.id === id);
    const label = targetExp ? `expense entry of ₹${targetExp.amount}` : 'this expense record';

    if (confirm(`Are you sure you want to delete ${label}?`)) {
      setIsDeletingExpense(id);
      try {
        await dbExpenses.delete(id);
        showSuccess(`Deleted ${label} successfully.`);
      } catch (error: any) {
        console.error('Delete expense error:', error);
        showError(error?.message || 'Failed to delete expense record.');
      } finally {
        setIsDeletingExpense(null);
      }
    }
  };

  // Filter & Search Expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const query = searchQuery.toLowerCase();
      const matchSearch =
        exp.category.toLowerCase().includes(query) ||
        (exp.description && exp.description.toLowerCase().includes(query));

      const matchCategory = filterCategory === 'all' || exp.category === filterCategory;

      return matchSearch && matchCategory;
    });
  }, [expenses, searchQuery, filterCategory]);

  return (
    <div className="space-y-6" id="expenses-tab">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 font-sans" id="expenses-title">
            Expenses Register
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">
            {subTab === 'ledger' 
              ? 'Log store bills, paper purchases, rent, labor payroll, and track net profits.'
              : 'Monitor rolls, papers, ink levels, wedding card cardstock, and receive automated warnings.'
            }
          </p>
        </div>
        {subTab === 'ledger' ? (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.25)] hover:scale-[1.02] active:scale-95 transition-all duration-150"
            id="btn-add-expense"
          >
            <Plus className="mr-2 h-4 w-4" />
            Log Expense
          </button>
        ) : (
          <button
            onClick={handleOpenStockCreate}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.25)] hover:scale-[1.02] active:scale-95 transition-all duration-150"
            id="btn-add-inventory"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Material
          </button>
        )}
      </div>

      {/* Sub tabs switcher */}
      <div className="flex border-b border-slate-150" id="expenses-subtabs">
        <button
          onClick={() => setSubTab('ledger')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all relative ${
            subTab === 'ledger'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          Expense Ledger
        </button>
        <button
          onClick={() => setSubTab('stock')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 relative ${
            subTab === 'stock'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Warehouse className="h-4 w-4" />
          Material Stock Levels
        </button>
      </div>

      {subTab === 'ledger' ? (
        <>
          {/* Financial Categories Breakdown Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4" id="expenses-summary-cards">
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rent</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1 font-sans">₹{totals.rent.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Electricity</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1 font-sans">₹{totals.electricity.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Materials</p>
              <p className="text-xl font-extrabold text-[#10B981] mt-1 font-sans font-sans">₹{totals.materials.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Labor Payroll</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1 font-sans">₹{totals.labor.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Misc Cost</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1 font-sans">₹{totals.misc.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Filtering and Search Controls */}
          <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
            <div className="flex-1 flex rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 items-center transition-all focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500/20">
              <Search className="h-4.5 w-4.5 text-slate-400 mr-2.5" />
              <input
                type="text"
                placeholder="Search expense description or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 focus:outline-none placeholder-slate-400 font-medium"
                id="search-expenses-input"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#2563EB] transition-all duration-150"
              id="select-category-filter"
            >
              <option value="all">All Categories</option>
              <option value="rent">Rent</option>
              <option value="electricity">Electricity</option>
              <option value="materials">Materials</option>
              <option value="labor">Labor</option>
              <option value="misc">Miscellaneous</option>
            </select>
          </div>

          {/* Expense Entries Table list */}
          {filteredExpenses.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
              <DollarSign className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-base font-bold text-gray-900 font-sans">No Expense Logs</h3>
              <p className="mt-1 text-sm text-slate-500 font-medium max-w-sm mx-auto">
                Keep track of operational expenditures by adding a new log.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50/75">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Category</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Description</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Bill Date</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Amount</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50/40 transition-colors duration-150">
                        <td className="whitespace-nowrap px-6 py-4.5 text-sm font-bold capitalize text-slate-800">
                          <span className="flex items-center">
                            <Tag className="mr-2 h-4 w-4 text-[#2563EB]" />
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 text-sm text-slate-600 font-medium max-w-md">
                          {expense.description || <span className="text-slate-300 italic font-normal">None</span>}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4.5 text-xs text-slate-400 font-semibold">
                          <div className="flex items-center">
                            <Clock className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                            {expense.date}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4.5 font-extrabold text-sm text-[#EF4444]">
                          ₹{expense.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4.5 text-right text-sm">
                          <button
                            onClick={() => handleDelete(expense.id)}
                            disabled={isDeletingExpense !== null}
                            className="p-2 text-[#EF4444] bg-red-50 hover:bg-red-100 rounded-xl transition disabled:opacity-40 active:scale-90"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Low stock general banner alert */}
          {inventory.some(item => item.quantity <= item.minThreshold) && (
            <div className="rounded-[18px] bg-amber-50 border border-amber-200/50 p-4.5 text-sm text-amber-850 flex items-start shadow-sm">
              <AlertTriangle className="mr-3 h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-slate-900 font-sans">Automated Supply Reorder Alerts</p>
                <p className="mt-1 font-medium text-amber-700">Certain media rolls or photo papers have dropped below minimum threshold limits. Order from distributors to avoid job downtime.</p>
              </div>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="flex rounded-xl border border-gray-100/80 bg-white p-3 shadow-[0_8px_30px_rgb(0,0,0,0.015)] items-center transition-all focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500/40">
            <Search className="h-5 w-5 text-slate-400 mr-2.5 ml-1" />
            <input
              type="text"
              placeholder="Search materials stock by item name..."
              value={stockSearchQuery}
              onChange={(e) => setStockSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-gray-950 focus:outline-none placeholder-slate-400 font-medium"
              id="search-inventory-input"
            />
          </div>

          {/* Inventory List table grid */}
          {filteredInventory.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
              <Warehouse className="mx-auto h-12 w-12 text-slate-350" />
              <h3 className="mt-4 text-base font-bold text-gray-900 font-sans">No Inventory Tracked</h3>
              <p className="mt-1 text-sm text-slate-500 font-medium max-w-sm mx-auto">
                {stockSearchQuery ? 'No stock matched your keyword.' : 'Register printing press rolls or camera accessories to track stock levels.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50/75">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Material Item Name</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Stock Level</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Rate (Per Unit)</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Min Threshold Limit</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Actions / Adjustments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-sm">
                    {filteredInventory.map((item) => {
                      const isLow = item.quantity <= item.minThreshold;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/40 transition-colors duration-150">
                          <td className="px-6 py-4.5 font-bold text-slate-900 font-sans">
                            {item.itemName}
                          </td>
                          <td className="px-6 py-4.5">
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => handleQuantityAdjust(item, -1)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-90"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className={`px-3 py-1 rounded-md text-sm font-extrabold text-center min-w-[50px] border ${isLow ? 'bg-amber-50 text-amber-700 border-amber-250/30' : 'bg-slate-50 text-slate-800 border-slate-200/40'}`}>
                                {item.quantity} {item.unit}
                              </span>
                              <button
                                onClick={() => handleQuantityAdjust(item, 1)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-90"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4.5 text-slate-900 font-extrabold text-sm">
                            {editingRateId === item.id ? (
                              <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                <span className="text-slate-400 text-xs font-bold">₹</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={editingRateValue}
                                  onChange={(e) => setEditingRateValue(e.target.value)}
                                  className="w-18 rounded-lg border border-[#2563EB] px-1.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-bold"
                                  autoFocus
                                  onBlur={() => handleSaveRate(item.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRate(item.id);
                                    if (e.key === 'Escape') setEditingRateId(null);
                                  }}
                                />
                              </div>
                            ) : (
                              <div 
                                onClick={() => {
                                  setEditingRateId(item.id);
                                  setEditingRateValue(item.rate?.toString() || '0');
                                }}
                                className="group flex items-center space-x-1.5 cursor-pointer hover:text-[#2563EB] transition-colors"
                                title="Click to edit rate"
                              >
                                <span>₹{item.rate !== undefined ? item.rate.toLocaleString('en-IN') : '0'}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 20.013a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                </svg>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4.5 text-slate-500 font-semibold text-xs">
                            {item.minThreshold} {item.unit}
                          </td>
                          <td className="px-6 py-4.5">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 border border-amber-100">
                                <AlertTriangle className="h-3 w-3" /> Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 border border-emerald-100">
                                <CheckCircle className="h-3 w-3" /> Healthy
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4.5 text-right text-sm">
                            <button
                              onClick={() => handleStockDelete(item.id)}
                              disabled={isDeletingStock !== null}
                              className="p-2 text-[#EF4444] bg-red-50 hover:bg-red-100 rounded-xl transition disabled:opacity-40 active:scale-95"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Log Expense Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-[24px] border border-gray-100 bg-white p-7 shadow-2xl relative"
              id="expense-creation-modal"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-900 font-sans tracking-tight">
                  Log Store Expenditure
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {errorMsg && (
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-600">
                    {errorMsg}
                  </div>
                )}

                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Expense Category *</label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                    id="select-expense-category"
                  >
                    <option value="misc">Miscellaneous</option>
                    <option value="materials">Printing Raw Materials</option>
                    <option value="labor">Labor Payroll / Salary</option>
                    <option value="rent">Shop Rent</option>
                    <option value="electricity">Power / Electricity Bill</option>
                  </select>
                </div>

                {/* Amount (₹) */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Spent Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-8 pr-4 text-sm text-[#EF4444] font-extrabold focus:border-[#EF4444] focus:ring-4 focus:ring-red-500/10 focus:outline-none transition-all duration-150"
                      placeholder="Enter cost in INR"
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Billing Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Expense Notes / Invoice reference</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Bought 2 packets glossy photopaper 12x18 size from distributor"
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none resize-none transition-all duration-150"
                  />
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] px-5 py-2.5 text-sm font-bold text-white hover:shadow-md hover:shadow-blue-500/10 active:scale-95 disabled:opacity-50 transition-all duration-150"
                  >
                    {isSubmitting ? 'Logging...' : 'Log Cost'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Track Material / Stock Dialog */}
      <AnimatePresence>
        {isStockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-[24px] border border-gray-100 bg-white p-7 shadow-2xl relative"
              id="inventory-creation-modal"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-900 font-sans tracking-tight">
                  Track New Supply Material
                </h3>
                <button
                  onClick={() => setIsStockModalOpen(false)}
                  className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleStockSubmit} className="mt-5 space-y-4">
                {stockErrorMsg && (
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-600">
                    {stockErrorMsg}
                  </div>
                )}

                {/* Item Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Material Name *</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. A4 Glossy Photo Paper 240GSM"
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                  />
                </div>

                {/* Quantity and units */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Initial Quantity *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Unit Label *</label>
                    <input
                      type="text"
                      required
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g. sheets, rolls, boxes"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                    />
                  </div>
                </div>

                {/* Rate & Min Threshold */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Rate (₹ per Unit)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={rate}
                        onChange={(e) => setRate(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-7 pr-3 text-sm text-slate-900 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Reorder Threshold *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={minThreshold}
                      onChange={(e) => setMinThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="e.g. 5"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-amber-600 font-bold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150"
                    />
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsStockModalOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isStockSubmitting}
                    className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] px-5 py-2.5 text-sm font-bold text-white hover:shadow-md hover:shadow-blue-500/10 active:scale-95 disabled:opacity-50 transition-all duration-150"
                  >
                    {isStockSubmitting ? 'Adding...' : 'Track Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
