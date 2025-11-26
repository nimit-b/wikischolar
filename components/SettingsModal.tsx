
import React, { useState, useEffect } from 'react';
import { X, Save, Key, User, Bot, Server, Cpu, Palette, Sun, Moon, Eye, Contrast, Image as ImageIcon, ToggleLeft, ToggleRight, AlertCircle, Sparkles } from 'lucide-react';
import { AIConfig, Theme } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AIConfig, theme: Theme) => void;
  currentConfig: AIConfig;
  currentTheme: Theme;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentConfig, currentTheme }) => {
  const [config, setConfig] = useState<AIConfig>(currentConfig);
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    setConfig(currentConfig);
    setTheme(currentTheme);
  }, [currentConfig, currentTheme, isOpen]);

  // Smart Default Logic
  const handleMainProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newProvider = e.target.value as any;
      let newModel = config.model;
      let updates: Partial<AIConfig> = { provider: newProvider };

      // Set main model defaults
      if (newProvider === 'openai') newModel = 'gpt-3.5-turbo';
      else if (newProvider === 'gemini') newModel = 'gemini-2.5-flash';
      else if (newProvider === 'openrouter') newModel = 'mistralai/mistral-7b-instruct:free';
      
      updates.model = newModel;

      // Ensure Puter is default for images if not already set
      if (!config.useSeparateImageModel) {
          updates.useSeparateImageModel = true;
          updates.imageModelProvider = 'puter';
          updates.imageModel = 'gemini-2.5-flash-image-preview';
      }

      setConfig({ ...config, ...updates });
  };

  if (!isOpen) return null;

  const handleSave = () => {
    const cleanConfig = {
        ...config,
        apiKey: config.apiKey.trim(),
        model: config.model.trim(),
        persona: config.persona.trim(),
        baseUrl: config.baseUrl?.trim(),
        imageModel: config.imageModel?.trim(),
        imageApiKey: config.imageApiKey?.trim()
    };
    onSave(cleanConfig, theme);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Bot className="text-brand-600" /> App Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Theme Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
             <label className="block text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
               <Palette size={18} className="text-brand-600"/> UI Theme
             </label>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button 
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${theme === 'light' ? 'bg-white border-brand-500 shadow-sm text-brand-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                    <Sun size={20} />
                    <span className="text-xs font-medium">Light</span>
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}`}
                >
                    <Moon size={20} />
                    <span className="text-xs font-medium">Dark</span>
                </button>
                <button 
                  onClick={() => setTheme('sepia')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${theme === 'sepia' ? 'bg-[#f4ecd8] border-[#d3cbb1] text-[#433422] shadow-sm ring-2 ring-[#d3cbb1]' : 'bg-[#f4ecd8] text-[#433422]/60 border-[#d3cbb1]'}`}
                >
                    <Eye size={20} />
                    <span className="text-xs font-medium">Sepia</span>
                </button>
                <button 
                  onClick={() => setTheme('contrast')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${theme === 'contrast' ? 'bg-black border-yellow-400 text-yellow-400 shadow-sm' : 'bg-black text-gray-500 border-gray-800'}`}
                >
                    <Contrast size={20} />
                    <span className="text-xs font-medium">Contrast</span>
                </button>
             </div>
          </div>

          {/* Persona Section */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <label className="block text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <User size={18} className="text-brand-600"/> Student Persona
            </label>
            <p className="text-xs text-slate-500 mb-3">
              This tells the AI how to tailor questions and explanations.
            </p>
            <input
              type="text"
              value={config.persona}
              onChange={(e) => setConfig({ ...config, persona: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm"
              placeholder="e.g. CBSE Class 10 Student"
            />
          </div>

          {/* Main AI Configuration */}
          <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Cpu size={16} /> Main Intelligence
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Server size={16} /> AI Provider
                </label>
                <select
                    value={config.provider}
                    onChange={handleMainProviderChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 bg-white"
                >
                    <option value="openrouter">OpenRouter (Recommended)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="custom">Custom URL</option>
                </select>
                </div>

                <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Cpu size={16} /> Model ID
                </label>
                <input
                    type="text"
                    value={config.model}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                    placeholder="Model ID"
                />
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Key size={16} /> API Key
                </label>
                <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                autoComplete="off"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 font-mono text-sm"
                placeholder="sk-..."
                />
            </div>
          </div>
          
          {config.provider === 'custom' && (
             <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Base URL</label>
                <input
                  type="text"
                  value={config.baseUrl || ''}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="https://api.example.com/v1"
                />
             </div>
          )}

          {/* Diagram Generation Settings */}
          <div className="pt-4 border-t border-slate-100">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon size={16} /> Visuals & Diagrams
                 </h3>
                 <button 
                    onClick={() => setConfig({...config, useSeparateImageModel: !config.useSeparateImageModel})}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${config.useSeparateImageModel ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                 >
                    {config.useSeparateImageModel ? <ToggleRight className="text-brand-600"/> : <ToggleLeft />}
                    {config.useSeparateImageModel ? 'Custom Config' : 'Use Defaults'}
                 </button>
             </div>

             {config.useSeparateImageModel ? (
                 <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-in fade-in slide-in-from-top-2">
                     <p className="text-xs text-amber-800 mb-4 flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5" />
                        Configure how images and diagrams are generated. Puter.js provides free access to premium models.
                     </p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-amber-900">Image Provider</label>
                            <select
                                value={config.imageModelProvider || 'puter'}
                                onChange={(e) => setConfig({ ...config, imageModelProvider: e.target.value as any })}
                                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white"
                            >
                                <option value="puter">Free (Puter.js)</option>
                                <option value="openrouter">OpenRouter</option>
                                <option value="gemini">Google Gemini</option>
                                <option value="openai">OpenAI</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-amber-900">Image Model</label>
                            {config.imageModelProvider === 'puter' ? (
                                <select 
                                    value={config.imageModel || 'gemini-2.5-flash-image-preview'}
                                    onChange={(e) => setConfig({ ...config, imageModel: e.target.value })}
                                    className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white"
                                >
                                    <option value="gemini-2.5-flash-image-preview">Gemini 2.5 Flash Image (Nano Banana)</option>
                                    <option value="black-forest-labs/FLUX.1-schnell">Flux.1 Schnell</option>
                                    <option value="stabilityai/stable-diffusion-3-medium">Stable Diffusion 3</option>
                                    <option value="dall-e-3">DALL-E 3</option>
                                    <option value="google/imagen-4.0-fast">Imagen 4.0 Fast</option>
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={config.imageModel || ''}
                                    onChange={(e) => setConfig({ ...config, imageModel: e.target.value })}
                                    className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm"
                                    placeholder="e.g. google/gemini-2.5-flash-image-preview"
                                />
                            )}
                        </div>
                     </div>
                     {config.imageModelProvider !== 'puter' && (
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-amber-900">API Key (Optional)</label>
                            <input
                                type="password"
                                value={config.imageApiKey || ''}
                                onChange={(e) => setConfig({ ...config, imageApiKey: e.target.value })}
                                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm font-mono"
                                placeholder="Leave blank to use Main API Key"
                            />
                        </div>
                     )}
                     {config.imageModelProvider === 'puter' && (
                         <div className="flex items-center gap-2 text-xs text-green-700 bg-green-100 p-2 rounded-lg">
                             <Sparkles size={12} />
                             <span>Using Puter.js - No API Key required for images!</span>
                         </div>
                     )}
                 </div>
             ) : (
                 <p className="text-xs text-slate-500 italic">
                    Images will use your main model configuration. Enable custom config to use the free Puter.js image generator.
                 </p>
             )}
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 mt-auto">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-sm shadow-brand-200"
          >
            <Save size={18} /> Save All
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;