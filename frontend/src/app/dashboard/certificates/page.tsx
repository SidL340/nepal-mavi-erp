'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Award,
  Printer,
  Search,
  Plus,
  FileText,
  X,
  School,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CertificatesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'character' | 'transfer' | 'history'>('character');

  // Student search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Form fields
  const [issuedDateBs, setIssuedDateBs] = useState(todayBS());
  const [characterGrade, setCharacterGrade] = useState('Excellent');
  const [reasonForLeave, setReasonForLeave] = useState('Guardian request');
  const [destinationSchool, setDestinationSchool] = useState('');
  const [conduct, setConduct] = useState('Good');
  const [issuedBy, setIssuedBy] = useState('Principal');
  const [selectedCertForPrint, setSelectedCertForPrint] = useState<any>(null);

  // Fetch student search
  const { data: searchResults } = useQuery({
    queryKey: ['students-cert-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const res = await api.get(`/students?search=${encodeURIComponent(searchQuery)}&limit=6`);
      return res.data?.data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // Fetch certificate history
  const { data: certsData, isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: async () => {
      const res = await api.get('/school/certificates');
      return res.data?.data || [];
    },
  });

  // Fetch school info for branding and seal
  const { data: schoolData } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  // Issue Certificate Mutation
  const issueCertMutation = useMutation({
    mutationFn: async (type: 'CHARACTER' | 'TRANSFER') => {
      if (!selectedStudent) throw new Error('Please search and select a student');
      const res = await api.post('/school/certificates', {
        studentId: selectedStudent.id,
        type,
        issuedDateBs,
        issuedBy,
        remarks: type === 'CHARACTER' ? `Conduct: ${characterGrade}` : `Transferred to: ${destinationSchool || 'New School'}`,
        data: {
          characterGrade,
          reasonForLeave,
          destinationSchool,
          conduct,
        },
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`${data.data.type} Certificate issued! Certificate No: ${data.data.certificateNo}`);
      setSelectedCertForPrint(data.data);
      setSelectedStudent(null);
      setSearchQuery('');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to issue certificate');
    },
  });

  const certificates = certsData || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Certificates Portal (चारित्रिक तथा स्थानान्तरण प्रमाणपत्र)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            Character Certificate (CC) तथा Transfer Certificate (TC) निर्माण र सिधै प्रिन्ट गर्ने सुविधा
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-200/70 p-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('character')}
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'character' ? 'bg-white text-[#1e3a5f] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Character Cert (चारित्रिक)
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'transfer' ? 'bg-white text-[#1e3a5f] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Transfer Cert (TC)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'history' ? 'bg-white text-[#1e3a5f] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Issued History (इतिहास)
          </button>
        </div>
      </div>

      {activeTab !== 'history' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Form */}
          <div className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#1e3a5f] border-b border-gray-100 pb-2 flex items-center gap-2">
              <Award size={16} />
              <span>Issue {activeTab === 'character' ? 'Character Certificate' : 'Transfer Certificate'}</span>
            </h2>

            {/* Student Search */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Select Student *:</label>
              {selectedStudent ? (
                <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 p-3">
                  <div>
                    <p className="text-xs font-bold text-[#1e3a5f]">{selectedStudent.fullName}</p>
                    <p className="text-[10px] text-gray-600 font-mono">ID: {selectedStudent.studentId} | DOB: {selectedStudent.dateOfBirthBs || '—'}</p>
                    <p className="text-[10px] text-gray-600">Father: {selectedStudent.fatherName || '—'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-blue-100 hover:text-gray-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by student name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="erp-input pl-9"
                  />
                  {searchResults && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg text-xs divide-y divide-gray-100">
                      {searchResults.map((st: any) => {
                        const clsName = st.classEnrollment?.[0]?.class?.name;
                        const secName = st.classEnrollment?.[0]?.class?.section;
                        return (
                          <div
                            key={st.id}
                            onClick={() => {
                              setSelectedStudent(st);
                              setSearchQuery('');
                            }}
                            className="flex cursor-pointer items-center justify-between rounded-lg p-2 hover:bg-blue-50 transition"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-900">{st.fullName}</span>
                              <span className="inline-block rounded-md bg-purple-100 text-purple-900 px-2 py-0.5 text-[10px] font-black font-nepali border border-purple-200">
                                {clsName ? `${clsName}${secName ? ` (${secName})` : ''}` : 'Unassigned'}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-gray-400 font-bold">{st.studentId}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Issue Date (BS):</label>
              <input
                type="text"
                value={issuedDateBs}
                onChange={(e) => setIssuedDateBs(e.target.value)}
                className="erp-input font-mono font-bold"
              />
            </div>

            {activeTab === 'character' ? (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Moral Character & Conduct (आचरण):</label>
                <select
                  value={characterGrade}
                  onChange={(e) => setCharacterGrade(e.target.value)}
                  className="erp-input font-semibold"
                >
                  <option value="Excellent">Excellent (उत्कृष्ट)</option>
                  <option value="Very Good">Very Good (धेरै राम्रो)</option>
                  <option value="Good">Good (राम्रो)</option>
                  <option value="Satisfactory">Satisfactory (सन्तोषजनक)</option>
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reason for Leaving (छोड्नुको कारण):</label>
                  <input
                    type="text"
                    value={reasonForLeave}
                    onChange={(e) => setReasonForLeave(e.target.value)}
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Destination School (जाने विद्यालय):</label>
                  <input
                    type="text"
                    placeholder="e.g. Higher Secondary School, Pokhara"
                    value={destinationSchool}
                    onChange={(e) => setDestinationSchool(e.target.value)}
                    className="erp-input"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Issued By / Signature:</label>
              <input
                type="text"
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
                className="erp-input font-semibold"
              />
            </div>

            <button
              type="button"
              disabled={issueCertMutation.isPending || !selectedStudent}
              onClick={() => issueCertMutation.mutate(activeTab === 'character' ? 'CHARACTER' : 'TRANSFER')}
              className="w-full rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] py-2.5 text-xs font-bold text-white transition disabled:opacity-60 shadow-sm"
            >
              {issueCertMutation.isPending ? 'Generating Certificate...' : 'Generate & Issue Certificate'}
            </button>
          </div>

          {/* Right 7 Cols: Live Certificate Preview */}
          <div className="lg:col-span-7 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 shadow-xs text-center space-y-5 font-serif">
            <div className="border-b-2 border-gray-800 pb-4">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="h-14 w-14 rounded-full overflow-hidden flex items-center justify-center shadow-xs border-2 border-amber-400 bg-white p-1">
                  {schoolData?.logoUrl ? (
                    <img src={schoolData.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <svg viewBox="0 0 100 100" className="h-full w-full text-[#1e3a5f]">
                      <circle cx="50" cy="50" r="46" stroke="#1e3a5f" strokeWidth="3" fill="#f0f7ff" />
                      <circle cx="50" cy="50" r="36" stroke="#b91c1c" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
                      <polygon points="50,16 59,36 81,36 63,49 70,71 50,57 30,71 37,49 19,36 41,36" fill="#f59e0b" />
                      <text x="50" y="55" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e3a5f">नेपाल</text>
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#1e3a5f] uppercase tracking-wider">
                    {schoolData?.name || 'NEPAL MODEL SECONDARY SCHOOL'}
                  </h3>
                  {schoolData?.nameNepali && (
                    <p className="text-xs text-gray-600 font-nepali">{schoolData.nameNepali}</p>
                  )}
                  <p className="text-[10px] text-gray-500 font-mono">
                    EMIS Code: {schoolData?.emisCode || '320160005'} • Estd: {schoolData?.estYear || '2025'} BS
                  </p>
                </div>
              </div>
              <div className="inline-block mt-1 bg-[#1e3a5f] text-white text-xs font-sans font-bold px-6 py-1 rounded-full uppercase tracking-widest">
                {activeTab === 'character' ? 'CHARACTER CERTIFICATE' : 'TRANSFER CERTIFICATE (TC)'}
              </div>
            </div>

            <div className="text-left text-xs leading-relaxed text-gray-800 space-y-4 py-2 font-serif">
              <div className="flex justify-between font-mono text-[11px] text-gray-500">
                <span>Cert No: <b>PREVIEW-001</b></span>
                <span>Date: <b>{issuedDateBs} BS</b></span>
              </div>

              {activeTab === 'character' ? (
                <p className="text-justify text-sm leading-loose">
                  This is to certify that Mr./Ms. <b className="text-gray-900 border-b border-gray-400 px-2">{selectedStudent?.fullName || '................................................'}</b>, 
                  son/daughter of Mr. <b className="text-gray-900 border-b border-gray-400 px-2">{selectedStudent?.fatherName || '................................................'}</b>, 
                  was a bonafide student of this school. According to the school records, his/her date of birth is 
                  <b className="font-mono text-gray-900 border-b border-gray-400 px-2">{selectedStudent?.dateOfBirthBs || '....................'}</b> (BS).
                  To the best of our knowledge, he/she bears an <b className="text-[#1e3a5f] uppercase underline">{characterGrade}</b> moral character and conduct.
                  We wish him/her every success in all future endeavors.
                </p>
              ) : (
                <p className="text-justify text-sm leading-loose">
                  This is to certify that Mr./Ms. <b className="text-gray-900 border-b border-gray-400 px-2">{selectedStudent?.fullName || '................................................'}</b>, 
                  student ID <b className="font-mono text-gray-900 border-b border-gray-400 px-2">{selectedStudent?.studentId || '....................'}</b>, 
                  has been granted permission to transfer from this institution. All school dues have been cleared.
                  Reason for leaving: <b className="text-gray-900">{reasonForLeave}</b>.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 pt-10 text-xs items-end">
              <div className="flex flex-col items-center">
                <div className="relative h-20 w-20 rounded-full border-4 border-double border-[#1e3a5f] flex flex-col items-center justify-center text-center p-1 bg-white/80 shadow-xs transform -rotate-3">
                  <div className="absolute inset-1 rounded-full border border-dashed border-[#1e3a5f]/60 pointer-events-none" />
                  <div className="h-6 w-6 mb-0.5 opacity-90 flex items-center justify-center">
                    {schoolData?.logoUrl ? (
                      <img src={schoolData.logoUrl} alt="Seal Logo" className="h-full w-full object-contain" />
                    ) : (
                      <svg viewBox="0 0 100 100" className="h-full w-full text-[#1e3a5f]">
                        <polygon points="50,15 61,38 86,38 66,54 74,78 50,62 26,78 34,54 14,38 39,38" fill="#1e3a5f" />
                      </svg>
                    )}
                  </div>
                  <div className="text-[6.5px] font-black uppercase text-[#1e3a5f] leading-none">
                    {schoolData?.nameNepali || 'नेपाल मा.वि.'}
                  </div>
                  <div className="text-[5.5px] font-extrabold uppercase bg-[#1e3a5f] text-white px-1 py-0.5 rounded-full mt-0.5">
                    ★ OFFICIAL SEAL ★
                  </div>
                </div>
                <span className="text-[10px] text-gray-600 font-sans font-semibold mt-1">School Seal (छाप)</span>
              </div>
              <div className="text-right pb-2">
                <span className="border-t border-gray-600 pt-1 font-sans font-bold">{issuedBy}</span>
                <p className="text-[10px] text-gray-500 font-sans">Head Teacher / Principal</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 3: History Table */
        <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f] text-white">
              <tr>
                <th className="p-3.5 font-bold uppercase">Certificate No</th>
                <th className="p-3.5 font-bold uppercase">Type</th>
                <th className="p-3.5 font-bold uppercase">Student Name</th>
                <th className="p-3.5 font-bold uppercase">Issue Date (BS)</th>
                <th className="p-3.5 font-bold uppercase">Issued By</th>
                <th className="p-3.5 font-bold uppercase text-center">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading certificate history...</td></tr>
              ) : certificates.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No certificates issued yet.</td></tr>
              ) : (
                certificates.map((cert: any) => (
                  <tr key={cert.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-[#1e3a5f]">{cert.certificateNo}</td>
                    <td className="p-3.5">
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        {cert.type}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-gray-900">{cert.student?.fullName}</td>
                    <td className="p-3.5 font-mono text-gray-600">{cert.issuedDateBs}</td>
                    <td className="p-3.5 text-gray-600">{cert.issuedBy || 'Principal'}</td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedCertForPrint(cert)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-700"
                        title="Print Certificate"
                      >
                        <Printer size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── PRINTABLE CERTIFICATE MODAL ────────────────────────────────────── */}
      {selectedCertForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between no-print border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-[#1e3a5f]">Official Certificate (प्रमाणपत्र)</span>
              <button onClick={() => setSelectedCertForPrint(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {/* Print paper */}
            <div className="printable-document p-10 border-4 border-double border-gray-800 rounded-xl space-y-6 text-center bg-amber-50/10 font-serif print:p-0 print:border-2 print:shadow-none print:rounded-none">
              <div className="border-b-2 border-gray-800 pb-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center shadow-xs border-2 border-amber-400 bg-white p-1">
                    {schoolData?.logoUrl ? (
                      <img src={schoolData.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <svg viewBox="0 0 100 100" className="h-full w-full text-[#1e3a5f]">
                        <circle cx="50" cy="50" r="46" stroke="#1e3a5f" strokeWidth="3" fill="#f0f7ff" />
                        <circle cx="50" cy="50" r="36" stroke="#b91c1c" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
                        <polygon points="50,16 59,36 81,36 63,49 70,71 50,57 30,71 37,49 19,36 41,36" fill="#f59e0b" />
                        <text x="50" y="55" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e3a5f">नेपाल</text>
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-[#1e3a5f] uppercase tracking-wider">
                      {schoolData?.name || 'NEPAL MODEL SECONDARY SCHOOL'}
                    </h3>
                    {schoolData?.nameNepali && (
                      <p className="text-sm text-gray-600 font-nepali">{schoolData.nameNepali}</p>
                    )}
                    <p className="text-xs text-gray-500 font-mono">
                      EMIS Code: {schoolData?.emisCode || '320160005'} • Estd: {schoolData?.estYear || '2025'} BS
                    </p>
                  </div>
                </div>
                <div className="inline-block mt-2 bg-[#1e3a5f] text-white text-xs font-sans font-bold px-6 py-1 rounded-full uppercase tracking-widest">
                  {selectedCertForPrint.type} CERTIFICATE
                </div>
              </div>

              <div className="flex justify-between text-xs font-mono text-gray-600">
                <span>Certificate No: <b>{selectedCertForPrint.certificateNo}</b></span>
                <span>Date of Issue: <b>{selectedCertForPrint.issuedDateBs} BS</b></span>
              </div>

              <div className="text-left text-sm leading-loose text-gray-800 space-y-4 py-4">
                <p className="text-justify">
                  This is to certify that Mr./Ms. <b className="text-gray-900 border-b border-gray-400 px-2">{selectedCertForPrint.student?.fullName}</b>, 
                  student ID <b className="font-mono text-gray-900 border-b border-gray-400 px-2">{selectedCertForPrint.student?.studentId}</b>, 
                  has successfully completed their academic term at this school.
                  {selectedCertForPrint.remarks ? ` Remarks: ${selectedCertForPrint.remarks}.` : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 pt-14 text-xs items-end">
                <div className="flex flex-col items-center">
                  <div className="relative h-24 w-24 rounded-full border-4 border-double border-[#1e3a5f] flex flex-col items-center justify-center text-center p-1 bg-white/80 shadow-xs transform -rotate-3">
                    <div className="absolute inset-1 rounded-full border border-dashed border-[#1e3a5f]/60 pointer-events-none" />
                    <div className="h-7 w-7 mb-0.5 opacity-90 flex items-center justify-center">
                      {schoolData?.logoUrl ? (
                        <img src={schoolData.logoUrl} alt="Seal Logo" className="h-full w-full object-contain" />
                      ) : (
                        <svg viewBox="0 0 100 100" className="h-full w-full text-[#1e3a5f]">
                          <polygon points="50,15 61,38 86,38 66,54 74,78 50,62 26,78 34,54 14,38 39,38" fill="#1e3a5f" />
                        </svg>
                      )}
                    </div>
                    <div className="text-[7.5px] font-black uppercase text-[#1e3a5f] leading-none">
                      {schoolData?.nameNepali || 'नेपाल मा.वि.'}
                    </div>
                    <div className="text-[6px] font-extrabold uppercase bg-[#1e3a5f] text-white px-1.5 py-0.5 rounded-full mt-0.5">
                      ★ OFFICIAL SEAL ★
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600 font-sans font-semibold mt-1">School Seal (छाप)</span>
                </div>
                <div className="text-right pb-2">
                  <span className="border-t border-gray-600 pt-1 font-sans font-bold">{selectedCertForPrint.issuedBy || 'Principal'}</span>
                  <p className="text-[10px] text-gray-500 font-sans">Head Teacher / Principal</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => setSelectedCertForPrint(null)}
                className="rounded-xl border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#2a5280]"
              >
                <Printer size={14} />
                <span>Print Certificate (प्रिन्ट)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
