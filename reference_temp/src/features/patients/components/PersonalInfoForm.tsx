import React, { useState, useRef } from 'react';
import { PersonalInfo } from '../../../types';
import { calculateAge } from '../../../utils/date';
import { Camera, Upload, Trash2, Check, User } from 'lucide-react';

interface PersonalInfoFormProps {
  data: PersonalInfo;
  onChange: (updates: Partial<PersonalInfo>) => void;
  onNext: () => void;
}

export default function PersonalInfoForm({ data, onChange, onNext }: PersonalInfoFormProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Age calculation for real-time indicator
  const age = data.birthdate ? calculateAge(data.birthdate) : null;

  // Real Camera capture
  const startCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access failed: ", err);
      setCameraError("Webcam not available or permission denied. Please upload an image instead.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 300;
      canvas.height = video.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onChange({ photoUrl: dataUrl });
      }
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onChange({ photoUrl: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    onChange({ photoUrl: '' });
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // accepts only numbers, no characters
    onChange({ mobile: val });
    if (errors.mobile) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.mobile;
        return copy;
      });
    }
  };

  // Strict Form Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!data.lastName || !data.lastName.trim()) {
      newErrors.lastName = "Last Name is required";
    }
    if (!data.firstName || !data.firstName.trim()) {
      newErrors.firstName = "First Name is required";
    }
    if (!data.birthdate) {
      newErrors.birthdate = "Birthdate is required";
    }
    if (!data.sex) {
      newErrors.sex = "Sex is required";
    }
    if (!data.mobile) {
      newErrors.mobile = "Mobile Number is required";
    } else if (!/^\d+$/.test(data.mobile)) {
      newErrors.mobile = "Mobile Number accepts only numbers, no letters/characters";
    } else if (data.mobile.length !== 11) {
      newErrors.mobile = "Mobile Number must be exactly 11 digits (e.g., 09xxxxxxxxx)";
    }
    if (!data.address || !data.address.trim()) {
      newErrors.address = "Home Address is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission / Validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onNext();
    } else {
      // scroll to first error
      const firstErrorKey = Object.keys(errors)[0] || "lastname";
      const idMap: Record<string, string> = {
        lastName: "patient-lastname",
        firstName: "patient-firstname",
        birthdate: "patient-birthdate",
        sex: "patient-sex",
        mobile: "patient-mobile",
        address: "patient-address"
      };
      const element = document.getElementById(idMap[firstErrorKey] || "personal-info-form");
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <form id="personal-info-form" onSubmit={handleSubmit} className="space-y-8" noValidate>
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 md:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2 font-display tracking-tight">
            <span className="p-1.5 bg-zinc-100 text-zinc-800 rounded-lg">
              <User className="w-5 h-5" />
            </span>
            Personal Information
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Please fill in all required clinical and demographic information.</p>
        </div>

        {/* Profile Image Section */}
        <div className="flex flex-col md:flex-row gap-6 items-start pb-6 border-b border-zinc-100">
          <div className="relative group">
            <div className="w-32 h-32 rounded-2xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:border-zinc-400">
              {data.photoUrl ? (
                <img 
                  src={data.photoUrl} 
                  alt="Patient profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-3">
                  <User className="w-10 text-zinc-300 mx-auto" />
                  <span className="text-xs text-zinc-400 mt-1 block font-medium">No Image</span>
                </div>
              )}
            </div>
            {data.photoUrl && (
              <button
                type="button"
                id="clear-photo-btn"
                onClick={clearPhoto}
                className="absolute -top-2 -right-2 p-1.5 bg-red-50 border border-red-200 text-red-500 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                title="Remove Photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-3 flex-1 w-full">
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider">Patient Photo / Identification</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                id="camera-open-btn"
                onClick={startCamera}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-zinc-500" />
                Capture photo
              </button>
              
              <button
                type="button"
                id="upload-file-btn"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-zinc-500" />
                Upload file
              </button>
              
              <input 
                ref={fileInputRef}
                type="file" 
                id="patient-photo-input"
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </div>
            
            <p className="text-xs text-zinc-400">Supported formats: JPG, PNG. Recommended 1:1 ratio.</p>


          </div>
        </div>

        {/* Active Webcam Section */}
        {showCamera && (
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col items-center justify-center space-y-4">
            <h3 className="text-sm font-semibold text-zinc-700">Webcam Capture</h3>
            {cameraError ? (
              <div className="text-center p-3 max-w-md">
                <p className="text-xs text-rose-500 font-medium mb-3">{cameraError}</p>
                <button
                  type="button"
                  id="close-camera-error-btn"
                  onClick={stopCamera}
                  className="px-3 py-1.5 bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg hover:bg-zinc-300"
                >
                  Close Camera Preview
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-64 h-64 bg-black rounded-xl overflow-hidden shadow-inner relative border border-zinc-300">
                  <video 
                    ref={videoRef} 
                    id="camera-stream-video"
                    className="w-full h-full object-cover scale-x-[-1]" // mirror effect
                    playsInline 
                    muted 
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    id="capture-snapshot-btn"
                    onClick={capturePhoto}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <Camera className="w-4 h-4" /> Take Snapshot
                  </button>
                  <button
                    type="button"
                    id="cancel-camera-btn"
                    onClick={stopCamera}
                    className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Lastname */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="patient-lastname"
              value={data.lastName}
              onChange={(e) => {
                onChange({ lastName: e.target.value });
                if (errors.lastName) setErrors(prev => { const c = {...prev}; delete c.lastName; return c; });
              }}
              required
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-hidden transition-all duration-150 bg-white ${
                errors.lastName 
                  ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-100' 
                  : 'border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100'
              }`}
            />
            {errors.lastName && (
              <p className="text-xs text-red-500 mt-1 font-semibold">{errors.lastName}</p>
            )}
          </div>

          {/* Firstname */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="patient-firstname"
              value={data.firstName}
              onChange={(e) => {
                onChange({ firstName: e.target.value });
                if (errors.firstName) setErrors(prev => { const c = {...prev}; delete c.firstName; return c; });
              }}
              required
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-hidden transition-all duration-150 bg-white ${
                errors.firstName 
                  ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-100' 
                  : 'border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100'
              }`}
            />
            {errors.firstName && (
              <p className="text-xs text-red-500 mt-1 font-semibold">{errors.firstName}</p>
            )}
          </div>

          {/* Middlename */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
              Middle Name
            </label>
            <input
              type="text"
              id="patient-middlename"
              value={data.middleName}
              onChange={(e) => onChange({ middleName: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          {/* Ext */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
              Ext (Suffix)
            </label>
            <input
              type="text"
              id="patient-ext"
              value={data.ext}
              onChange={(e) => onChange({ ext: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          {/* Nickname */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
              Nickname
            </label>
            <input
              type="text"
              id="patient-nickname"
              value={data.nickname}
              onChange={(e) => onChange({ nickname: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          {/* Birthdate with Age Badge adjusted up/beside label */}
          <div className="col-span-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                Birthdate <span className="text-red-500">*</span>
              </label>
              {age !== null && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  age < 18 ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse' : 'bg-zinc-100 text-zinc-700'
                }`}>
                  Age: {age} {age < 18 && ' (Minor)'}
                </span>
              )}
            </div>
            <input
              type="date"
              id="patient-birthdate"
              value={data.birthdate}
              onChange={(e) => {
                onChange({ birthdate: e.target.value });
                if (errors.birthdate) setErrors(prev => { const c = {...prev}; delete c.birthdate; return c; });
              }}
              required
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-hidden transition-all duration-150 bg-white ${
                errors.birthdate 
                  ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-100' 
                  : 'border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100'
              }`}
            />
            {errors.birthdate && (
              <p className="text-xs text-red-500 mt-1 font-semibold">{errors.birthdate}</p>
            )}
          </div>

          {/* Sex */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
              Sex <span className="text-red-500">*</span>
            </label>
            <select
              id="patient-sex"
              value={data.sex}
              onChange={(e) => {
                onChange({ sex: e.target.value as any });
                if (errors.sex) setErrors(prev => { const c = {...prev}; delete c.sex; return c; });
              }}
              required
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-hidden transition-all duration-150 bg-white ${
                errors.sex 
                  ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-100' 
                  : 'border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100'
              }`}
            >
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.sex && (
              <p className="text-xs text-red-500 mt-1 font-semibold">{errors.sex}</p>
            )}
          </div>

          {/* Mobile */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="patient-mobile"
              value={data.mobile}
              onChange={handleMobileChange}
              required
              maxLength={11}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-hidden transition-all duration-150 bg-white ${
                errors.mobile 
                  ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-100' 
                  : 'border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100'
              }`}
            />
            {errors.mobile && (
              <p className="text-xs text-red-500 mt-1 font-semibold">{errors.mobile}</p>
            )}
          </div>

          {/* Email */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              id="patient-email"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          {/* Blood Type */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Blood Type
            </label>
            <select
              id="patient-bloodtype"
              value={data.bloodType}
              onChange={(e) => onChange({ bloodType: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            >
              <option value="">Unknown</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          {/* Civil Status (Not Required anymore per instructions) */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Civil Status
            </label>
            <select
              id="patient-civilstatus"
              value={data.civilStatus}
              onChange={(e) => onChange({ civilStatus: e.target.value as any })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            >
              <option value="">Select status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Widowed">Widowed</option>
              <option value="Separated">Separated</option>
              <option value="Divorced">Divorced</option>
            </select>
          </div>

          {/* Address */}
          <div className="col-span-2 md:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Home Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="patient-address"
              value={data.address}
              onChange={(e) => {
                onChange({ address: e.target.value });
                if (errors.address) setErrors(prev => { const c = {...prev}; delete c.address; return c; });
              }}
              required
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-hidden transition-all duration-150 bg-white ${
                errors.address 
                  ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-100' 
                  : 'border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100'
              }`}
            />
            {errors.address && (
              <p className="text-xs text-red-500 mt-1 font-semibold">{errors.address}</p>
            )}
          </div>

          {/* School */}
          <div className="col-span-1 md:col-span-1">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              School / University
            </label>
            <input
              type="text"
              id="patient-school"
              value={data.school}
              onChange={(e) => onChange({ school: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          {/* HMO (Not Required anymore per instructions) */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              HMO Provider / "No HMO"
            </label>
            <input
              type="text"
              id="patient-hmo"
              value={data.hmo}
              onChange={(e) => onChange({ hmo: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          {/* Referred By */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Referred By
            </label>
            <input
              type="text"
              id="patient-referredby"
              value={data.referredBy}
              onChange={(e) => onChange({ referredBy: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          {/* Weight */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Weight (kg)
            </label>
            <input
              type="number"
              id="patient-weight"
              value={data.weight}
              onChange={(e) => onChange({ weight: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              min="1"
            />
          </div>

          {/* Height */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Height (cm)
            </label>
            <input
              type="number"
              id="patient-height"
              value={data.height}
              onChange={(e) => onChange({ height: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              min="1"
            />
          </div>

          {/* Occupation */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Occupation
            </label>
            <input
              type="text"
              id="patient-occupation"
              value={data.occupation}
              onChange={(e) => onChange({ occupation: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          {/* Company */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Company Name
            </label>
            <input
              type="text"
              id="patient-company"
              value={data.company}
              onChange={(e) => onChange({ company: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          id="personal-info-next-btn"
          className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer duration-150"
        >
          Next Page: Guardian details
        </button>
      </div>
    </form>
  );
}
