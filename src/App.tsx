import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, GraduationCap, FileBarChart, Clock, Bell, LogOut, 
  Search, Plus, Trash2, Edit2, Download, Upload, CheckCircle2, QrCode,
  MapPin, RefreshCw, Layers, ShieldCheck, Award, X, AlertTriangle, ListFilter,
  UserPlus, UserCheck, BookOpen, AlertCircle, Sparkles, Building, Camera, HelpCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import { 
  DbUser, DbStudent, DbTeacher, DbClass, DbSubject, DbSchedule, 
  DbAttendance, DbNotification, DbActivityLog, AttendanceStatus 
} from './types';
import AuthScreen from './components/AuthScreen';

export default function App() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<DbUser | null>(() => {
    const saved = localStorage.getItem('sa_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sa_token'));

  // Active View Tab inside the user dashboard
  const [activeTab, setActiveTab] = useState('dashboard');

  // Schema state loaded from Express server.ts API
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<DbSubject[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Filtering states inside UI grids
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('');

  // Forms / Modals state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({
    id: '', // Empty means create, filled means edit
    studentCode: '',
    fullName: '',
    email: '',
    classId: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    phone: '',
    address: '',
    status: 'Active' as 'Active' | 'Suspended' | 'Inactive'
  });

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState({
    className: '',
    room: '',
    teacherId: ''
  });

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    classId: '',
    subjectId: '',
    teacherId: '',
    dayOfWeek: 'Monday',
    startTime: '09:00',
    endTime: '11:00'
  });

  // Batch CSV text state
  const [csvInputText, setCsvInputText] = useState(
    "std_code_99,Alice Kingsley,alice.k@student.edu,cls_1,Female,+1 (555) 777-1111,Garden District\n" +
    "std_code_88,Bob Harrison,bob.h@student.edu,cls_1,Male,+1 (555) 888-2222,Main Campus Quad"
  );
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvMessage, setCsvMessage] = useState('');

  // Attendance Sheet taking system state (Teacher / Admin workflow)
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState('');
  const [selectedAttendanceSubject, setSelectedAttendanceSubject] = useState('');
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [currentAttendanceList, setCurrentAttendanceList] = useState<Array<{
    studentId: string;
    studentName: string;
    studentCode: string;
    status: AttendanceStatus;
    remarks: string;
  }>>([]);

  // QR Checkin Terminal view state
  const [qrClassAndSubject, setQrClassAndSubject] = useState(''); // e.g. "cls_1|sub_101"
  const [activeQrCodeUrl, setActiveQrCodeUrl] = useState('');
  const [qrTimer, setQrTimer] = useState<number | null>(null);

  // Student QR Scanner Checkin Simulation State
  const [scannedClassId, setScannedClassId] = useState('');
  const [scannedSubjectId, setScannedSubjectId] = useState('');
  const [currentGps, setCurrentGps] = useState({ lat: 40.7128, lng: -74.0060 }); // NYU Manhattan HQ default
  const [simulatedScanOutput, setSimulatedScanOutput] = useState('');
  const [simulatationError, setSimulationError] = useState('');

  // Dashboard overall summary stats state
  const [dashboardStats, setDashboardStats] = useState({
    activeStudents: 0,
    activeTeachers: 0,
    totalClasses: 0,
    presentToday: 0,
    absentToday: 0,
    excusedToday: 0,
    todayPresentPercent: 94
  });
  const [weeklyTrend, setWeeklyTrend] = useState<any[]>([]);
  const [lowestPerformers, setLowestPerformers] = useState<any[]>([]);

  // PDF/Excel export preview spreadsheet state
  const [reportClassId, setReportClassId] = useState('');
  const [reportSubjectId, setReportSubjectId] = useState('');
  const [reporterRows, setReporterRows] = useState<any[]>([]);

  // System general notifications status banner
  const [systemAlertMessage, setSystemAlertMessage] = useState('');

  // Loading indicator states
  const [globalLoading, setGlobalLoading] = useState(false);

  // Initial authentication callback
  const handleLoginSuccess = (user: DbUser, userToken: string) => {
    localStorage.setItem('sa_user', JSON.stringify(user));
    localStorage.setItem('sa_token', userToken);
    setCurrentUser(user);
    setToken(userToken);
    setSystemAlertMessage(`Logged in successfully as ${user.full_name} (${user.role})`);
    setTimeout(() => setSystemAlertMessage(''), 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('sa_user');
    localStorage.removeItem('sa_token');
    setCurrentUser(null);
    setToken(null);
  };

  // Sync data pipeline from local files Express backend
  const fetchData = async () => {
    if (!currentUser) return;
    try {
      setGlobalLoading(true);

      // Async fetching variables parallelized
      const [
        studentsRes, teachersRes, classesRes, schedulesRes, 
        subjectsRes, attendanceRes, notificationsRes, logsRes, dashboardRes
      ] = await Promise.all([
        fetch(`/api/students`),
        fetch(`/api/teachers`),
        fetch(`/api/classes`),
        fetch(`/api/schedules`),
        fetch(`/api/subjects`),
        fetch(`/api/attendance`),
        fetch(`/api/notifications/${currentUser.id}`),
        fetch(`/api/activity-logs`),
        fetch(`/api/analytics/dashboard`)
      ]);

      const [
        studentsData, teachersData, classesData, schedulesData,
        subjectsData, attendanceData, notificationsData, logsData, dashboardData
      ] = await Promise.all([
        studentsRes.json(),
        teachersRes.json(),
        classesRes.json(),
        schedulesRes.json(),
        subjectsRes.json(),
        attendanceRes.json(),
        notificationsRes.json(),
        logsRes.json(),
        dashboardRes.json()
      ]);

      setStudents(studentsData);
      setTeachers(teachersData);
      setClasses(classesData);
      setSchedules(schedulesData);
      setSubjects(subjectsData);
      setAttendanceLogs(attendanceData);
      setNotifications(notificationsData);
      setActivityLogs(logsData);
      
      // Load Analytics dashboard stats
      if (dashboardData.stats) {
        setDashboardStats(dashboardData.stats);
        setWeeklyTrend(dashboardData.weeklyTrend || []);
        setLowestPerformers(dashboardData.lowestPerformers || []);
      }

      // Default first items for lists
      if (classesData.length > 0 && !selectedAttendanceClass) {
        setSelectedAttendanceClass(classesData[0].id);
        setReportClassId(classesData[0].id);
      }
      if (subjectsData.length > 0 && !selectedAttendanceSubject) {
        setSelectedAttendanceSubject(subjectsData[0].id);
        setReportSubjectId(subjectsData[0].id);
      }

    } catch (err) {
      console.error('API integration failure', err);
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, activeTab]);

  // Handle active countdown for Class QR Codes simulation
  useEffect(() => {
    if (qrClassAndSubject) {
      // Setup live refresh signature on QR
      const [clsId, subId] = qrClassAndSubject.split('|');
      const tokenSig = `qr_sig_${clsId}_${subId}_${Date.now()}`;
      QRCode.toDataURL(JSON.stringify({
        classId: clsId,
        subjectId: subId,
        token: tokenSig,
        lat: 40.7128,
        lng: -74.0060
      })).then(url => {
        setActiveQrCodeUrl(url);
      });
    }
  }, [qrClassAndSubject]);

  // Watch and fetch current GPS of the simulated client to display live high-precision indicators
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          console.log("Using academy mock GPS position coordinates.");
        }
      );
    }
  }, []);

  // Fetch / Generate roll call list based on chosen Class and subject
  const loadRollCallList = () => {
    if (!selectedAttendanceClass || !selectedAttendanceSubject) return;

    // Filter students enrolled inside this class
    const roster = students.filter(s => s.class_id === selectedAttendanceClass && s.status === 'Active');
    
    // Check if attendance is already present on server for selected date
    const dayAttendance = attendanceLogs.filter(
      a => a.class_id === selectedAttendanceClass && 
           a.subject_id === selectedAttendanceSubject && 
           a.attendance_date === selectedAttendanceDate
    );

    const checkList = roster.map(stu => {
      const recorded = dayAttendance.find(a => a.student_id === stu.id);
      return {
        studentId: stu.id,
        studentName: stu.full_name,
        studentCode: stu.student_code,
        status: recorded ? recorded.status : ('Present' as AttendanceStatus),
        remarks: recorded ? recorded.remarks : ''
      };
    });

    setCurrentAttendanceList(checkList);
  };

  // Run initial state loader for teacher roll call list once parameters click
  useEffect(() => {
    loadRollCallList();
  }, [selectedAttendanceClass, selectedAttendanceSubject, selectedAttendanceDate, students, attendanceLogs]);

  // Mark interactive student status line inside active roll call view
  const toggleStudentStatus = (index: number, newStatus: AttendanceStatus) => {
    const nextArr = [...currentAttendanceList];
    nextArr[index].status = newStatus;
    setCurrentAttendanceList(nextArr);
  };

  const handleStudentRemarks = (index: number, val: string) => {
    const nextArr = [...currentAttendanceList];
    nextArr[index].remarks = val;
    setCurrentAttendanceList(nextArr);
  };

  // Submit bulk records to Express Database API
  const submitRollCallGrid = async () => {
    if (!selectedAttendanceClass || !selectedAttendanceSubject) return;
    try {
      setGlobalLoading(true);
      const res = await fetch('/api/attendance/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedAttendanceClass,
          subjectId: selectedAttendanceSubject,
          date: selectedAttendanceDate,
          records: currentAttendanceList.map(item => ({
            studentId: item.studentId,
            status: item.status,
            remarks: item.remarks
          })),
          activeUserId: currentUser?.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSystemAlertMessage(`🎉 Roll Call Registry updated with ${currentAttendanceList.length} status sheets.`);
      setTimeout(() => setSystemAlertMessage(''), 4000);
      
      // Refresh state
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to catalog sheet records.");
    } finally {
      setGlobalLoading(false);
    }
  };

  // CSV Spreadsheet bulk parsing simulator logic
  const handleCsvExecution = async () => {
    setCsvMessage('');
    const rows = csvInputText.split('\n').filter(r => r.trim().length > 0);
    const parsedData = rows.map(r => {
      const cols = r.split(',');
      return {
        studentCode: cols[0]?.trim() || '',
        fullName: cols[1]?.trim() || '',
        email: cols[2]?.trim() || '',
        classId: cols[3]?.trim() || 'cls_1',
        gender: cols[4]?.trim() || 'Other',
        phone: cols[5]?.trim() || '',
        address: cols[6]?.trim() || ''
      };
    });

    try {
      const res = await fetch('/api/students/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: parsedData,
          activeUserId: currentUser?.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCsvMessage(`Successfully loaded ${data.importedCount} student files. Dups skipped: ${data.skipped?.length || 0}`);
      setShowCsvImport(false);
      fetchData();
    } catch (error: any) {
      setCsvMessage(`Error: ${error.message}`);
    }
  };

  // Create or update a student card record
  const saveStudentForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!studentForm.id;
      const url = isEdit ? `/api/students/${studentForm.id}` : '/api/students';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...studentForm,
          activeUserId: currentUser?.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSystemAlertMessage(`Student card successfully conserved.`);
      setTimeout(() => setSystemAlertMessage(''), 4000);
      setIsStudentModalOpen(false);
      setStudentForm({
        id: '', studentCode: '', fullName: '', email: '', classId: classes[0]?.id || '',
        gender: 'Male', phone: '', address: '', status: 'Active'
      });
      fetchData();
    } catch (error: any) {
      alert(error.message || "Student register update failed.");
    }
  };

  // Trigger elimination of a student code card
  const handleStudentDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to remove ${name} from active directories? This clears historic timesheet records for the student.`)) return;

    try {
      const res = await fetch(`/api/students/${id}?activeUserId=${currentUser?.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSystemAlertMessage("Student enrollment registry deleted.");
      setTimeout(() => setSystemAlertMessage(''), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Registry purge operation failed.');
    }
  };

  // Initialize Class Form Action
  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...classForm,
          activeUserId: currentUser?.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSystemAlertMessage(`New academic class established successfully!`);
      setTimeout(() => setSystemAlertMessage(''), 4000);
      setIsClassModalOpen(false);
      setClassForm({ className: '', room: '', teacherId: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Initialize Schedule Form Action
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scheduleForm,
          activeUserId: currentUser?.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSystemAlertMessage(`Subject timeslot added to schedule!`);
      setTimeout(() => setSystemAlertMessage(''), 4000);
      setIsScheduleModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Run Self QR-checkin simulation (simulation workflow built inside Student role menu)
  const executeSimulationQrCheckin = async () => {
    setSimulatedScanOutput('');
    setSimulationError('');

    if (!scannedClassId || !scannedSubjectId) {
      setSimulationError("Please choose which classroom QR beacon signals you are scanning.");
      return;
    }

    try {
      const res = await fetch('/api/attendance/self-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentUserId: currentUser?.id,
          classId: scannedClassId,
          subjectId: scannedSubjectId,
          checkinToken: `simulated_token_${Date.now()}`,
          lat: currentGps.lat,
          lng: currentGps.lng
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSimulatedScanOutput(`Checkin Confirmed: status "${data.status}" registered on server at ${data.checkInTime}!`);
      setSystemAlertMessage(`✅ Self check-in verified near campus coordinates!`);
      setTimeout(() => setSystemAlertMessage(''), 5000);
      
      fetchData();
    } catch (error: any) {
      setSimulationError(error.message || "Attendance checkin request was declined.");
    }
  };

  // Dismiss user notifications
  const markNotificationAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
      // reload notifications
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Compile Academic Report Grid Preview
  useEffect(() => {
    if (reportClassId) {
      // Find students in this class
      const classStus = students.filter(s => s.class_id === reportClassId);
      
      const rows = classStus.map(stu => {
        // filter attendance logs
        const logs = attendanceLogs.filter(a => a.student_id === stu.id);
        const subjectLogs = reportSubjectId ? logs.filter(l => l.subject_id === reportSubjectId) : logs;
        
        const sessionsCount = subjectLogs.length;
        const presentCount = subjectLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
        const absentCount = subjectLogs.filter(a => a.status === 'Absent').length;
        const excusedCount = subjectLogs.filter(a => a.status === 'Excused').length;
        const percent = sessionsCount > 0 ? Math.round((presentCount / sessionsCount) * 100) : 100;

        return {
          code: stu.student_code,
          name: stu.full_name,
          email: stu.email,
          sessions: sessionsCount,
          present: presentCount,
          absent: absentCount,
          excused: excusedCount,
          percentage: percent
        };
      });

      setReporterRows(rows);
    }
  }, [reportClassId, reportSubjectId, students, attendanceLogs]);

  // Handle Export CSV mock file downloads on browser client
  const triggerSpreadsheetDownload = () => {
    const headers = "Student Code,Student Name,Email,Sessions Tracked,Present,Absent,Excused,Percentage\n";
    const bodyStr = reporterRows.map(r => 
      `"${r.code}","${r.name}","${r.email}",${r.sessions},${r.present},${r.absent},${r.excused},${r.percentage}%`
    ).join("\n");

    const blob = new Blob([headers + bodyStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_report_${reportClassId || 'all'}_export.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // If user session is not initialized
  if (!currentUser || !token) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Find Student Card details if user has student role
  const isStudent = currentUser.role === 'Student';
  const isTeacher = currentUser.role === 'Teacher';
  const isAdmin = currentUser.role === 'Admin';

  const myStudentCard = isStudent ? students.find(s => s.user_id === currentUser.id) : null;
  const myStudentCourseAttendance = isStudent && myStudentCard 
    ? attendanceLogs.filter(a => a.student_id === myStudentCard.id) 
    : [];
  
  // Calculate average attendance score for matching student
  let myAverageAttendance = 100;
  if (myStudentCourseAttendance.length > 0) {
    const presentCount = myStudentCourseAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
    myAverageAttendance = Math.round((presentCount / myStudentCourseAttendance.length) * 100);
  }

  // Filter students based on state inputs
  let studentGridFiltered = students.map(s => {
    const clsMatch = classes.find(c => c.id === s.class_id);
    return {
      ...s,
      class_name: clsMatch ? clsMatch.class_name : 'No Class Assigned'
    };
  });

  if (studentSearch) {
    studentGridFiltered = studentGridFiltered.filter(s => 
      s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.student_code.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase())
    );
  }
  if (studentClassFilter) {
    studentGridFiltered = studentGridFiltered.filter(s => s.class_id === studentClassFilter);
  }
  if (studentStatusFilter) {
    studentGridFiltered = studentGridFiltered.filter(s => s.status === studentStatusFilter);
  }

  return (
    <div id="school-app-shell" className="min-h-screen bg-slate-900 flex flex-col font-sans select-none antialiased">
      
      {/* Dynamic top message banner */}
      {systemAlertMessage && (
        <div className="bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 flex items-center justify-between shadow-md absolute top-0 inset-x-0 z-50 animate-slide-down">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{systemAlertMessage}</span>
          </div>
          <button onClick={() => setSystemAlertMessage('')} className="text-white hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main shell block bar */}
      <header className="bg-slate-950 border-b border-slate-800 text-slate-100 flex-none h-14 md:h-16 flex items-center justify-between px-4 md:px-6 relative z-10 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            🎓
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider text-slate-400 font-mono uppercase">Academy Portal</div>
            <div className="text-sm md:text-base font-bold text-slate-100 flex items-center gap-1.5 leading-none mt-0.5">
              Smart Student Attendance System
              <span className="hidden sm:inline-block bg-indigo-500/15 border border-indigo-500/20 text-[10px] text-indigo-400 font-mono rounded-full px-2 py-0.5">
                v1.12-secure
              </span>
            </div>
          </div>
        </div>

        {/* Action controls / Quick profiles dashboard preview togglers */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono">Simulating Node Container:</span>
            <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-mono bg-indigo-950/45 px-2.5 py-1 rounded-sm border border-indigo-900/40">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
              PORT 3000 (Vite Reverse-Proxy)
            </div>
          </div>

          {/* User profile details header */}
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg py-1 px-1.5 md:py-1.5 md:px-2.5">
            <img 
              src={currentUser.avatar_url} 
              alt={currentUser.full_name} 
              className="h-6 w-6 md:h-8 md:w-8 rounded-full border border-slate-700 object-cover bg-slate-800"
            />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-100 leading-none">{currentUser.full_name}</div>
              <div className="text-[10px] font-mono font-medium text-slate-400 leading-none mt-1.5 flex items-center gap-1 text-slate-350">
                <span className="px-1.5 py-0.5 rounded-xs bg-indigo-950 text-indigo-300 font-mono text-[9px] uppercase border border-indigo-800/45">
                  🛡️ {currentUser.role}
                </span>
                {isStudent && myStudentCard && (
                  <span className="text-slate-400">{myStudentCard.student_code}</span>
                )}
              </div>
            </div>
            
            <button 
              id="header_logout_btn"
              onClick={handleLogout}
              title="Secure Logout Session"
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
            >
              <LogOut className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main portal grid workspace row layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Responsive Left Navigation Rail Sidebar */}
        <nav className="w-16 md:w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="py-4 px-2 md:px-4 space-y-1.5">
            
            <div className="hidden md:block text-slate-500 text-[10px] font-mono tracking-widest uppercase mb-3.5 px-2">
              Management Portal
            </div>

            {/* General Tabs */}
            <button 
              id="tab_dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'dashboard' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Users className="h-5 w-5 shrink-0" />
              <span className="hidden md:inline">Analytics Panel</span>
            </button>

            {/* Admin and Teacher control tabs */}
            {(isAdmin || isTeacher) && (
              <>
                <button 
                  id="tab_attendance"
                  onClick={() => setActiveTab('attendance')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    activeTab === 'attendance' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Calendar className="h-5 w-5 shrink-0" />
                  <span className="hidden md:inline">Roll Register</span>
                </button>

                <button 
                  id="tab_qr_checkin"
                  onClick={() => setActiveTab('terminal_qr')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    activeTab === 'terminal_qr' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <QrCode className="h-5 w-5 shrink-0" />
                  <span className="hidden md:inline">Beacon QR Terminal</span>
                </button>
              </>
            )}

            {/* Admin only views */}
            {isAdmin && (
              <>
                <button 
                  id="tab_roster"
                  onClick={() => setActiveTab('roster')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    activeTab === 'roster' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <GraduationCap className="h-5 w-5 shrink-0" />
                  <span className="hidden md:inline">Student Directory</span>
                </button>

                <button 
                  id="tab_classes"
                  onClick={() => setActiveTab('classes')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    activeTab === 'classes' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Building className="h-5 w-5 shrink-0" />
                  <span className="hidden md:inline">Classes & Slots</span>
                </button>
              </>
            )}

            {/* Student specific check-in workflow */}
            {isStudent && (
              <button 
                id="tab_self_scan"
                onClick={() => {
                  setActiveTab('self_scan');
                  // prefill simulator selection
                  if (classes.length > 0) setScannedClassId(classes[0].id);
                  if (subjects.length > 0) setScannedSubjectId(subjects[0].id);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition bg-linear-to-r ${
                  activeTab === 'self_scan' 
                    ? 'from-indigo-600 to-emerald-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Camera className="h-5 w-5 shrink-0 text-emerald-400" />
                <span className="hidden md:inline text-slate-100 font-semibold">QR Self Check-In</span>
              </button>
            )}

            {/* Reports tab for Admin / Teacher */}
            {(isAdmin || isTeacher) && (
              <button 
                id="tab_reports"
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === 'reports' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <FileBarChart className="h-5 w-5 shrink-0" />
                <span className="hidden md:inline">Spreadsheets & Export</span>
              </button>
            )}

            {/* Audit Logs Trail tab for Admin */}
            {isAdmin && (
              <button 
                id="tab_logs"
                onClick={() => setActiveTab('logs')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === 'logs' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Clock className="h-5 w-5 shrink-0" />
                <span className="hidden md:inline">Audit Log Trail</span>
              </button>
            )}

          </div>

          {/* Quick instructions and warnings box */}
          <div className="p-4 border-t border-slate-800 space-y-4 hidden md:block">
            <div className="bg-slate-900 rounded-lg p-3 text-xs border border-slate-800">
              <div className="text-slate-350 font-semibold mb-1 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-405 text-indigo-400 font-bold" />
                Role Environment
              </div>
              <p className="text-slate-450 leading-relaxed text-[11px]">
                You are running with full <strong className="text-indigo-300">{currentUser.role}</strong> authorization context with direct Express.js endpoint controls.
              </p>
            </div>

            <div className="text-center">
              <span className="text-[10px] text-slate-550 font-mono text-slate-450">Smart Student Attend v1.12</span>
            </div>
          </div>
        </nav>

        {/* Primary workspace layout */}
        <main className="flex-1 bg-slate-900 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          
          {/* Notifications Alerts Rail */}
          {notifications.length > 0 && (
            <div id="school_notifications_rail" className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 mb-2">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4.5 w-4.5 text-indigo-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-355 text-slate-300 font-mono">
                  Personal Warnings & Bulletins Alert Rail
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {notifications.filter(u => !u.is_read).slice(0, 3).map((notice) => (
                  <div key={notice.id} className="relative bg-slate-900 border border-slate-800 hover:border-indigo-500/30 rounded-lg p-3 flex gap-2.5 items-start justify-between transition shadow-3xs">
                    <div className="flex gap-2.5 items-start">
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mt-1.5 animate-pulse"></span>
                      <div>
                        <div className="text-xs font-bold text-slate-200">{notice.title}</div>
                        <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{notice.message}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">{new Date(notice.created_at).toLocaleTimeString()}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => markNotificationAsRead(notice.id)}
                      className="text-xs text-indigo-400 hover:text-indigo-200 shrink-0 font-mono p-1 rounded-sm bg-slate-950 border border-slate-800 hover:border-slate-750"
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Render Switcher */}
          
          {/* 1. VIEW TAB: ANALYTICS DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
                  <p className="text-sm text-slate-400">Class presence rates, roll call indexes, and performance metrics overview.</p>
                </div>
                <button 
                  id="dash_refresh_btn"
                  onClick={fetchData} 
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg shadow-sm transition active:scale-97"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
                  Request Live Seed Recalculation
                </button>
              </div>

              {/* Status metric dashboard cards grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="absolute right-3 top-3 h-8 w-8 text-indigo-4000 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-xs text-slate-400 font-medium">Students Enrolled</div>
                  <div className="mt-2 text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight" id="dashboard_students_count">
                    {dashboardStats.activeStudents}
                  </div>
                  <div className="text-[11px] text-indigo-400 mt-1.5 font-mono flex items-center gap-1">
                    <span>Active database sheets</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="absolute right-3 top-3 h-8 w-8 text-emerald-400 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                    <Award className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-xs text-slate-400 font-medium">Daily Present Rate</div>
                  <div className="mt-2 text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight" id="dashboard_presence_percent">
                    {dashboardStats.todayPresentPercent}%
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1.5 font-mono">
                    Target: {'>'}90% benchmark
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="absolute right-3 top-3 h-8 w-8 text-amber-400 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/10">
                    <Building className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-xs text-slate-400 font-medium">Course Classes</div>
                  <div className="mt-2 text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight">
                    {dashboardStats.totalClasses}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1.5">
                    Rooms deployed
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="absolute right-3 top-3 h-8 w-8 text-rose-400 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/10">
                    <Calendar className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-xs text-slate-400 font-medium">Instructor Count</div>
                  <div className="mt-2 text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight">
                    {dashboardStats.activeTeachers}
                  </div>
                  <div className="text-[11px] text-rose-400 mt-1.5 font-mono">
                    Approved departments
                  </div>
                </div>

              </div>

              {/* Core Analytics visual components: Chart + Sidebar alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Custom Native High-Fidelity SVG Line Chart for Analytics */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 lg:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-200">
                        Past 12-Day Attendance Trend Chart
                      </h3>
                      <p className="text-xs text-slate-450 text-slate-400">
                        Tracks standard system presence ratios dynamically.
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-slate-350 text-slate-300">
                        <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                        Presence Rate %
                      </div>
                    </div>
                  </div>

                  {/* SVG Canvas Area */}
                  <div className="relative w-full h-56 mt-4">
                    {weeklyTrend.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                        Computing database analytics matrix...
                      </div>
                    ) : (
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 540 180" id="presence_trend_svg">
                        {/* Define gradients */}
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3"/>
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0"/>
                          </linearGradient>
                        </defs>

                        {/* Chart Grid Lines */}
                        <line x1="30" y1="20" x2="520" y2="20" stroke="#1e293b" strokeDasharray="3,3" />
                        <line x1="30" y1="60" x2="520" y2="60" stroke="#1e293b" strokeDasharray="3,3" />
                        <line x1="30" y1="100" x2="520" y2="100" stroke="#1e293b" strokeDasharray="3,3" />
                        <line x1="30" y1="140" x2="520" y2="140" stroke="#1e293b" strokeDasharray="3,3" />
                        
                        {/* Text labels for Y-axis */}
                        <text x="5" y="24" className="text-[10px] fill-slate-500 font-mono">100%</text>
                        <text x="5" y="64" className="text-[10px] fill-slate-500 font-mono">75%</text>
                        <text x="5" y="104" className="text-[10px] fill-slate-500 font-mono">50%</text>
                        <text x="5" y="144" className="text-[10px] fill-slate-500 font-mono">25%</text>

                        {/* Generate points array based on weeklyTrend */}
                        {(() => {
                          const width = 490;
                          const count = weeklyTrend.length;
                          const gridStep = width / (count - 1);
                          
                          // Convert points
                          const points = weeklyTrend.map((t, idx) => {
                            const x = 30 + (idx * gridStep);
                            // scale Y: rate from 0-100% mapped inside Y index heights (from 20 to 140)
                            const scale = (100 - t.rate) / 100;
                            const y = 20 + (scale * 120);
                            return { x, y, label: t.date, rate: t.rate };
                          });

                          // Generate path commands
                          const dAttr = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                          const fillAttr = `${dAttr} L ${points[points.length-1].x} 140 L ${points[0].x} 140 Z`;

                          return (
                            <>
                              {/* Filled shape */}
                              <path d={fillAttr} fill="url(#chartGradient)" />
                              {/* Line stroke */}
                              <path d={dAttr} fill="none" stroke="#6366f1" strokeWidth="2.5" />
                              
                              {/* Interactive Datapoints dots */}
                              {points.map((p, idx) => (
                                <g key={idx} className="group cursor-pointer">
                                  <circle cx={p.x} cy={p.y} r="4.5" className="fill-slate-900 stroke-indigo-500 stroke-2 group-hover:r-6.5 transition" />
                                  {/* Tooltip on hover */}
                                  <rect x={p.x - 22} y={p.y - 24} width="44" height="15" rx="3" className="fill-slate-950 stroke-slate-800 stroke-1 opacity-0 group-hover:opacity-100 transition" />
                                  <text x={p.x} y={p.y - 14} className="text-[9px] fill-indigo-400 font-bold font-mono text-center opacity-0 group-hover:opacity-100 transition" textAnchor="middle">{p.rate}%</text>
                                  {/* X axis index date tags */}
                                  {idx % 2 === 0 && (
                                    <text x={p.x} y="162" className="text-[9px] fill-slate-500 font-mono text-charcoal-400" textAnchor="middle">{p.label}</text>
                                  )}
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    )}
                  </div>
                </div>

                {/* Left Alert List: At-risk students with lower attendance ratios */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-200">
                        At-Risk Student Alerts
                      </h3>
                      <p className="text-xs text-slate-400 leading-none mt-1">
                        Attendance ratios falling under 85% alert boundary.
                      </p>
                    </div>
                    <span className="p-1 px-2 rounded-sm bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold font-mono text-[10px]">
                      Trigger alert
                    </span>
                  </div>

                  <div className="space-y-3.5 pt-2">
                    {lowestPerformers.length === 0 ? (
                      <div className="text-xs text-slate-500 py-6 text-center">
                        All student index ratios meet secure thresholds.
                      </div>
                    ) : (
                      lowestPerformers.slice(0, 4).map((record, i) => {
                        const isCritical = record.rate < 80;
                        return (
                          <div key={i} className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition">
                            <div className="space-y-1">
                              <div className="text-xs font-bold text-slate-200">{record.name}</div>
                              <div className="text-[10px] font-mono text-slate-400 space-x-2">
                                <span>{record.student_code}</span>
                                <span className="text-slate-500">•</span>
                                <span>{record.total_sessions} sessions tracked</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-xs font-mono font-bold px-2 py-0.5 rounded-sm ${
                                isCritical 
                                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
                                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                              }`}>
                                {record.rate}% Attend
                              </div>
                              <span className="text-[9px] text-slate-500 block mt-1">
                                {isCritical ? "⚠️ Warning level" : "Moderate drop"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-3 bg-indigo-950/20 rounded-lg border border-indigo-900/40 text-xs text-indigo-450 text-indigo-300">
                    <span className="font-bold flex items-center gap-1.5 mb-1 text-indigo-200">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Counseling Guidelines
                    </span>
                    Students highlighted are automatically queued flag alerts to teachers for academic review during grade processing.
                  </div>
                </div>

              </div>
              
              {/* Comprehensive Class overview list in interactive card grids */}
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-200">
                      Live Active Class Sessions Registry
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      A list of established school study programs, room slot paths, and lead professors.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {classes.map((c) => {
                    const statusVal = Math.floor(Math.random() * 2) === 0 ? "In Progress" : "Awaiting Slot";
                    return (
                      <div key={c.id} className="p-4 bg-slate-900 border border-slate-800 hover:border-indigo-400/40 rounded-xl transition relative overflow-hidden group">
                        <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-emerald-500"></div>
                        <div className="text-[10px] font-mono text-indigo-400 mb-1 leading-none uppercase tracking-wider font-semibold">
                          CAMPUS SLOT: {c.room}
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-100 group-hover:text-white mb-2">
                          {c.class_name}
                        </h4>
                        
                        <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-slate-450 block text-[10px] text-slate-500">Lead Professor</span>
                            <span className="font-medium text-slate-200">{c.teacher_name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-450 block text-[10px] text-slate-500">Active Students</span>
                            <span className="font-mono font-bold text-indigo-300">{c.student_count || 3} members</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}


          {/* 2. VIEW TAB: ROSTER CATALOG DIRECTORY (Admin Only) */}
          {activeTab === 'roster' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Student Directory Directory</h1>
                  <p className="text-sm text-slate-400">Enroll new student accounts, upload spreadsheets, and manage profile registrations.</p>
                </div>
                
                <div className="flex gap-2.5">
                  <button 
                    id="open_csv_import_btn"
                    onClick={() => setShowCsvImport(!showCsvImport)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-350 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg shadow-sm transition active:scale-97"
                  >
                    <Upload className="h-4 w-4" />
                    CSV Spreadsheet Upload
                  </button>

                  <button 
                    id="open_enroll_student_btn"
                    onClick={() => {
                      setStudentForm({
                        id: '', studentCode: `STU-2026-${String(students.length + 10).padStart(3, '0')}`,
                        fullName: '', email: '', classId: classes[0]?.id || '',
                        gender: 'Male', phone: '', address: '', status: 'Active'
                      });
                      setIsStudentModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition active:scale-98"
                  >
                    <UserPlus className="h-4 w-4 text-white" />
                    Enroll Custom Student
                  </button>
                </div>
              </div>

              {/* CSV Spreadsheet Simulator Drawer */}
              {showCsvImport && (
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                  <div className="flex justify-between items-center text-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                      Sparks Digital CSV Spreadsheet Loader
                    </h3>
                    <button onClick={() => setShowCsvImport(false)} className="text-slate-400 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Paste raw text. Column formats should align with standard:
                    <code className="bg-slate-900 px-1.5 py-0.5 rounded ml-1 text-slate-300 font-mono">
                      student_code,full_name,email,class_id,gender,phone,address
                    </code>
                  </p>
                  
                  <textarea 
                    value={csvInputText} 
                    onChange={(e) => setCsvInputText(e.target.value)} 
                    rows={4}
                    className="w-full text-xs font-mono p-3 bg-slate-900 text-slate-300 border border-slate-800 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />

                  <div className="flex justify-end gap-2 text-xs">
                    <button 
                      onClick={() => setShowCsvImport(false)} 
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-md"
                    >
                      Close Form
                    </button>
                    <button 
                      onClick={handleCsvExecution}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md"
                    >
                      Process CSV Queue
                    </button>
                  </div>
                </div>
              )}

              {csvMessage && (
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400">
                  {csvMessage}
                </div>
              )}

              {/* Roster database filtration toolbox */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 flex flex-col md:flex-row gap-4 items-center justify-between border-slate-800">
                
                {/* Search input */}
                <div className="relative w-full md:max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search by name, email, code..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 text-sm bg-slate-900 text-slate-200 border border-slate-800 rounded-lg w-full focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* Filters select */}
                <div className="flex flex-wrap items-center gap-3.5 w-full md:w-auto">
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Class Filter:</span>
                    <select 
                      value={studentClassFilter}
                      onChange={(e) => setStudentClassFilter(e.target.value)}
                      className="bg-slate-900 text-slate-100 border border-slate-800 rounded-md py-1 px-2.5 text-xs focus:outline-hidden"
                    >
                      <option value="">Show All Classes</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.class_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Status Filter:</span>
                    <select 
                      value={studentStatusFilter}
                      onChange={(e) => setStudentStatusFilter(e.target.value)}
                      className="bg-slate-900 text-slate-100 border border-slate-800 rounded-md py-1 px-2.5 text-xs focus:outline-hidden"
                    >
                      <option value="">Show All Status</option>
                      <option value="Active">Active Students</option>
                      <option value="Suspended">Suspended Profiles</option>
                      <option value="Inactive">Inactive Profiles</option>
                    </select>
                  </div>

                </div>

              </div>

              {/* Interactive Directory Roster Database Grid Table */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto shadow-md">
                <table className="min-w-full divide-y divide-slate-850 border-collapse">
                  <thead className="bg-slate-900">
                    <tr className="border-b border-slate-800">
                      <th scope="col" className="px-6 py-3 text-left text-xs font-mono tracking-wider font-bold uppercase text-slate-400 select-none">
                        Student Ident Code
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-mono tracking-wider font-bold uppercase text-slate-400 select-none">
                        Full Name & Biography
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-mono tracking-wider font-bold uppercase text-slate-400 select-none">
                        Assigned Class Stream
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-mono tracking-wider font-bold uppercase text-slate-400 select-none">
                        Contact Details
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-mono tracking-wider font-bold uppercase text-slate-400 select-none">
                        Status Code
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-mono tracking-wider font-bold uppercase text-slate-400 select-none">
                        Administrative Controls
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-350">
                    {studentGridFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-xs text-slate-500 font-mono">
                          No registered students mathing filtered database conditions.
                        </td>
                      </tr>
                    ) : (
                      studentGridFiltered.map((stu) => (
                        <tr key={stu.id} className="hover:bg-slate-900/40 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-indigo-400 font-bold">
                            {stu.student_code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <img src={stu.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2'} className="h-8 w-8 rounded-full border border-slate-700 bg-slate-800 scale-95 object-cover" />
                              <div>
                                <div className="text-sm font-bold text-slate-200">{stu.full_name}</div>
                                <div className="text-xs text-slate-400">{stu.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-300">
                            {stu.class_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 max-w-xs truncate">
                            <div>{stu.phone}</div>
                            <div className="text-[10px] text-slate-500">{stu.address}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs">
                            <span className={`px-2 py-0.5 rounded-sm font-semibold font-mono text-[10px] ${
                              stu.status === 'Active' 
                                ? 'bg-emerald-500/10 border border-emerald-500/10 text-emerald-400'
                                : stu.status === 'Suspended'
                                  ? 'bg-rose-500/10 border border-rose-500/10 text-rose-450 text-rose-400 font-bold'
                                  : 'bg-slate-800 border border-slate-700 text-slate-450 text-slate-400'
                            }`}>
                              {stu.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold">
                            <div className="flex justify-end gap-2.5">
                              
                              <button 
                                id={`edit_student_btn_${stu.id}`}
                                onClick={() => {
                                  setStudentForm({
                                    id: stu.id,
                                    studentCode: stu.student_code,
                                    fullName: stu.full_name,
                                    email: stu.email,
                                    classId: stu.class_id,
                                    gender: stu.gender,
                                    phone: stu.phone,
                                    address: stu.address,
                                    status: stu.status
                                  });
                                  setIsStudentModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>

                              <button 
                                id={`delete_student_btn_${stu.id}`}
                                onClick={() => handleStudentDelete(stu.id, stu.full_name)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>

                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ENROLL MODAL DRAWER BOX POPUP */}
              {isStudentModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-xl relative animate-fade-in text-left">
                    
                    <div className="flex justify-between items-center p-5 border-b border-slate-850">
                      <h3 className="text-base font-bold text-white uppercase tracking-wider font-sans">
                        {studentForm.id ? "Edit Student Profile details" : "Enroll custom student card"}
                      </h3>
                      <button onClick={() => setIsStudentModalOpen(false)} className="text-slate-405 hover:text-white">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={saveStudentForm} className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">Student Code</label>
                          <input 
                            type="text" 
                            required
                            disabled={!!studentForm.id}
                            placeholder="STU-2026-X"
                            value={studentForm.studentCode}
                            onChange={(e) => setStudentForm({ ...studentForm, studentCode: e.target.value })}
                            className="w-full text-xs font-mono p-2.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-lg focus:outline-hidden focus:border-indigo-500 border-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">Assigned Room Unit</label>
                          <select 
                            value={studentForm.classId}
                            onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })}
                            className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-lg focus:outline-hidden focus:border-indigo-500 border-slate-800"
                          >
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>{c.class_name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">Full Student Name</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Alex Mercer"
                            value={studentForm.fullName}
                            onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                            className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-lg focus:outline-hidden focus:border-indigo-500 border-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">Institutional Email</label>
                          <input 
                            type="email" 
                            required
                            disabled={!!studentForm.id}
                            placeholder="alex@student.edu"
                            value={studentForm.email}
                            onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                            className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-lg focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">Gender Identification</label>
                          <select 
                            value={studentForm.gender}
                            onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                            className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-lg focus:outline-hidden"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">Profile Status</label>
                          <select 
                            value={studentForm.status}
                            onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value as any })}
                            className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-lg focus:outline-hidden"
                          >
                            <option value="Active">Active Student</option>
                            <option value="Suspended">Suspended Profile</option>
                            <option value="Inactive">Inactive Profile</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">Phone Number</label>
                          <input 
                            type="text" 
                            placeholder="+1 (555) 000-0000"
                            value={studentForm.phone}
                            onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                            className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-lg focus:outline-hidden border-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">Home Residence Address</label>
                          <input 
                            type="text" 
                            placeholder="Manhattan HQ Ave, NYC"
                            value={studentForm.address}
                            onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                            className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-lg focus:outline-hidden border-slate-800"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-850">
                        <button 
                          onClick={() => setIsStudentModalOpen(false)}
                          className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 font-medium text-xs rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button 
                          id="submit_student_form"
                          type="submit"
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
                        >
                          Confer Student Profile
                        </button>
                      </div>
                    </form>

                  </div>
                </div>
              )}

            </div>
          )}


          {/* 3. VIEW TAB: CLASSES & LESSON SLOTS MANAGEMENT */}
          {activeTab === 'classes' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Classes & Scheduling Slot</h1>
                  <p className="text-sm text-slate-400">Manage school class registry rooms, assign schedules, and schedule timetable courses.</p>
                </div>

                <div className="flex gap-2">
                  <button 
                    id="open_schedule_modal_btn"
                    onClick={() => {
                      if (classes.length > 0 && subjects.length > 0 && teachers.length > 0) {
                        setScheduleForm({
                          classId: classes[0].id,
                          subjectId: subjects[0].id,
                          teacherId: teachers[0].id,
                          dayOfWeek: 'Monday',
                          startTime: '09:00',
                          endTime: '11:00'
                        });
                        setIsScheduleModalOpen(true);
                      } else {
                        alert("Please configure subjects and lead teacher accounts before scheduling timetables.");
                      }
                    }}
                    className="flex justify-center items-center gap-2 py-2 px-3.5 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 bg-slate-950 hover:bg-slate-900 shadow-3xs hover:shadow-2xs transition"
                  >
                    <Plus className="h-4 w-4" />
                    Configure Schedule Timeslot
                  </button>

                  <button 
                    id="open_class_modal_btn"
                    onClick={() => {
                      if (teachers.length > 0) {
                        setClassForm({ className: '', room: '', teacherId: teachers[0].id });
                        setIsClassModalOpen(true);
                      } else {
                        alert("Configure Teacher Accounts first to assign leads to new modules.");
                      }
                    }}
                    className="flex justify-center items-center gap-2 py-2 px-3.5 bg-indigo-600 hover:bg-indigo-755 border border-transparent rounded-lg text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition active:scale-98"
                  >
                    <Plus className="h-4 w-4" />
                    Create Study Program Class
                  </button>
                </div>
              </div>

              {/* Classroom Layout cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Classes Registry */}
                <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-400">
                    Programs, Rooms & Pro Roster Registers
                  </h3>

                  <div className="space-y-3.5">
                    {classes.map((cls) => (
                      <div key={cls.id} className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-200">{cls.class_name}</h4>
                          <div className="text-xs font-mono text-slate-400 mt-1 flex gap-4">
                            <span>ROOM: {cls.room}</span>
                            <span>•</span>
                            <span className="text-slate-550">Lead: {cls.teacher_name}</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-indigo-300">
                          {cls.student_count || 0} students
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Full Active Schedule Slots Timeslots Table */}
                <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-400">
                    Active Weekly Subject Scheduled Slots (Roster Match Tracking)
                  </h3>

                  <div className="space-y-3">
                    {schedules.map((sch) => (
                      <div key={sch.id} className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between hover:border-indigo-550 transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-sm bg-indigo-500/10 text-indigo-405 border border-indigo-500/20 text-indigo-300 font-bold text-[10px] font-mono">{sch.subject_code}</span>
                            <h4 className="text-xs font-extrabold text-slate-200">{sch.subject_name}</h4>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-2">
                            <span className="text-slate-300 font-bold">{sch.day_of_week}s</span>
                            <span>•</span>
                            <span>{sch.start_time} - {sch.end_time}</span>
                            <span>•</span>
                            <span className="text-indigo-400 font-mono text-[10px]">({sch.class_name})</span>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 font-sans">
                          Prof. {sch.teacher_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* CLASS SUBMIT FORM POPUP */}
              {isClassModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm shadow-xl relative animate-fade-in text-left">
                    <div className="flex justify-between items-center p-4 border-b border-slate-850">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create Study Program Class</h3>
                      <button onClick={() => setIsClassModalOpen(false)} className="text-slate-400 hover:text-white">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={handleClassSubmit} className="p-4 space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 text-slate-300">Class Name title</label>
                        <input 
                          type="text" 
                          required
                          placeholder="CS Sophomore Beta etc."
                          value={classForm.className}
                          onChange={(e) => setClassForm({ ...classForm, className: e.target.value })}
                          className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-802 rounded-lg border-slate-805"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 text-slate-300">Room Designation</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Turing Seminar Room 402"
                          value={classForm.room}
                          onChange={(e) => setClassForm({ ...classForm, room: e.target.value })}
                          className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-802 rounded-lg border-slate-805"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 text-slate-300">Lead Professor Account</label>
                        <select 
                          value={classForm.teacherId}
                          onChange={(e) => setClassForm({ ...classForm, teacherId: e.target.value })}
                          className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-802 rounded-lg focus:outline-hidden"
                        >
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.full_name} ({t.department})</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex justify-end gap-2 text-xs pt-3 border-t border-slate-850">
                        <button onClick={() => setIsClassModalOpen(false)} type="button" className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded-md">Cancel</button>
                        <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md">Create Class</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TIMETABLE SCHEDULE SUBMIT FORM POPUP */}
              {isScheduleModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm shadow-xl relative animate-fade-in text-left">
                    <div className="flex justify-between items-center p-4 border-b border-slate-850">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configure Schedule Timeslot</h3>
                      <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-white">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={handleScheduleSubmit} className="p-4 space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 text-slate-350">Applicable Study Program</label>
                        <select 
                          value={scheduleForm.classId}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, classId: e.target.value })}
                          className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-lg focus:outline-hidden"
                        >
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.class_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 text-slate-350">Subject Course Course</label>
                        <select 
                          value={scheduleForm.subjectId}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, subjectId: e.target.value })}
                          className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-lg focus:outline-hidden animate-none"
                        >
                          {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.subject_code} - {s.subject_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 text-slate-350">Instructing Teacher</label>
                        <select 
                          value={scheduleForm.teacherId}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, teacherId: e.target.value })}
                          className="w-full text-xs p-2.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-lg focus:outline-hidden"
                        >
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.full_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-slate-350">Weekday</label>
                          <select 
                            value={scheduleForm.dayOfWeek}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, dayOfWeek: e.target.value })}
                            className="w-full text-xs p-1.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-md focus:outline-hidden"
                          >
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-slate-350">Start Time</label>
                          <input 
                            type="text" 
                            required
                            placeholder="09:00"
                            value={scheduleForm.startTime}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                            className="w-full text-xs p-1.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-slate-350">End Time</label>
                          <input 
                            type="text" 
                            required
                            placeholder="11:00"
                            value={scheduleForm.endTime}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                            className="w-full text-xs p-1.5 bg-slate-950 text-slate-100 border border-slate-805 rounded-md"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 text-xs pt-3 border-t border-slate-850">
                        <button onClick={() => setIsScheduleModalOpen(false)} type="button" className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded-md">Cancel</button>
                        <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md">Configure Slot</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}


          {/* 4. VIEW TAB: ATTENDANCE SHEETS ROLL REGISTER DIRECT TAKE */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Standard Roll Register Control</h1>
                  <p className="text-sm text-slate-400">Mark manual roll call sheets, update state checklists, and verify present metrics.</p>
                </div>
              </div>

              {/* Roster sheet parameters configuration block */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-slate-800">
                
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-450 text-slate-400 mb-1.5">Configure Target Program Class</label>
                  <select 
                    value={selectedAttendanceClass}
                    onChange={(e) => setSelectedAttendanceClass(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-hidden"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.class_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-455 text-slate-400 mb-1.5">Subject Agenda Course</label>
                  <select 
                    value={selectedAttendanceSubject}
                    onChange={(e) => setSelectedAttendanceSubject(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-hidden"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.subject_code} - {s.subject_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-455 text-slate-400 mb-1.5">Roll Sheet Date Entry</label>
                  <input 
                    type="date"
                    value={selectedAttendanceDate}
                    onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-805 p-1.5 rounded-lg text-xs text-white focus:outline-hidden border-slate-800 font-mono"
                  />
                </div>

                <div>
                  <button 
                    id="submit_bulk_roll_btn"
                    onClick={submitRollCallGrid}
                    className="w-full flex justify-center items-center gap-2 py-2 px-4 rounded-lg text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition active:scale-98"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Publish Checklist State
                  </button>
                </div>

              </div>

              {/* Attendance Registry taking Grid Sheet List */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
                
                <div className="p-4 bg-slate-900/70 border-b border-slate-850 flex justify-between items-center px-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-300">
                      Roll Sheet Matrix: <span className="text-indigo-400">
                        {classes.find(c => c.id === selectedAttendanceClass)?.class_name || 'N/A'}
                      </span>
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {currentAttendanceList.length} matching students cataloged
                  </span>
                </div>

                <div className="divide-y divide-slate-800/80 px-6">
                  {currentAttendanceList.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500 font-mono">
                      No active students enrolled in this classroom stream.
                    </div>
                  ) : (
                    currentAttendanceList.map((item, index) => {
                      return (
                        <div key={item.studentId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          
                          {/* Name and identity */}
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                              {item.studentName}
                              <span className="text-[10px] font-mono text-slate-500">({item.studentCode})</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">Student code card authorization locked</span>
                          </div>

                          {/* Control Status selector widgets */}
                          <div className="flex flex-wrap items-center gap-2">
                            
                            <button 
                              id={`status_present_${item.studentId}`}
                              onClick={() => toggleStudentStatus(index, 'Present')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition border ${
                                item.status === 'Present' 
                                  ? 'bg-emerald-600/15 border-emerald-500 text-emerald-400' 
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Present
                            </button>

                            <button 
                              id={`status_absent_${item.studentId}`}
                              onClick={() => toggleStudentStatus(index, 'Absent')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition border ${
                                item.status === 'Absent' 
                                  ? 'bg-rose-600/15 border-rose-500 text-rose-450 text-rose-400' 
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Absent
                            </button>

                            <button 
                              id={`status_late_${item.studentId}`}
                              onClick={() => toggleStudentStatus(index, 'Late')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition border ${
                                item.status === 'Late' 
                                  ? 'bg-amber-600/15 border-amber-500 text-amber-400' 
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Late
                            </button>

                            <button 
                              id={`status_excused_${item.studentId}`}
                              onClick={() => toggleStudentStatus(index, 'Excused')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition border ${
                                item.status === 'Excused' 
                                  ? 'bg-indigo-600/15 border-indigo-505 text-indigo-400 border-indigo-500' 
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Excused
                            </button>

                            {/* Optional Remarks typing */}
                            <input 
                              type="text" 
                              placeholder="Add custom remark..."
                              value={item.remarks}
                              onChange={(e) => handleStudentRemarks(index, e.target.value)}
                              className="text-xs bg-slate-900 text-slate-300 border border-slate-800 rounded-md py-1 px-3 ml-2 placeholder-slate-550 w-full sm:w-44 focus:outline-hidden"
                            />

                          </div>

                        </div>
                      );
                    })
                  )}
                </div>

              </div>

            </div>
          )}


          {/* 5. VIEW TAB: PORTABLE QR CHECKIN BEACON TERMINAL FOR CLASSROOMS */}
          {activeTab === 'terminal_qr' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">QR Code beacon Terminal</h1>
                  <p className="text-sm text-slate-400">Generate high-security rotation classroom check-in QR codes for physical lecture wall terminals.</p>
                </div>
              </div>

              {/* QR controls block container */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-400">
                    Configure Active QR beacon parameters
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
                        Select target Classroom & Subject pairing
                      </label>
                      <select 
                        value={qrClassAndSubject} 
                        onChange={(e) => setQrClassAndSubject(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-805 text-xs text-white p-2.5 rounded-lg focus:outline-hidden border-slate-800"
                      >
                        <option value="">-- Choose Roster Stream Slot --</option>
                        {schedules.map(sch => (
                          <option key={sch.id} value={`${sch.class_id}|${sch.subject_id}`}>
                            {sch.class_name} — {sch.subject_code} ({sch.day_of_week})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-400 leading-relaxed space-y-2">
                      <p className="font-bold text-slate-200">🛡️ Rotation Check Encryption</p>
                      <p>Once generated, students scan using their mobile view. The internal Express.js server verifies schedule day constraints, class membership, and GPS bounds relative to Hawking Room coordinates.</p>
                    </div>
                  </div>
                </div>

                {/* Main live wall display card */}
                <div className="bg-slate-950 rounded-xl p-6 border border-slate-800 lg:col-span-2 text-center flex flex-col items-center justify-center space-y-5">
                  {activeQrCodeUrl ? (
                    <div className="bg-slate-900 border border-slate-750 p-6 rounded-2xl flex flex-col items-center max-w-sm w-full shadow-inner">
                      
                      <div className="text-xs font-bold font-mono text-indigo-305 text-indigo-400 tracking-wider uppercase mb-1.5 leading-none">
                        Self-Check-In QR code active
                      </div>
                      
                      {/* Generative QR block */}
                      <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 scale-95 transition-transform duration-1000">
                        <img src={activeQrCodeUrl} alt="Class Checkin QR" className="h-48 w-48" id="terminal_qr_image" />
                      </div>

                      <div className="text-[10px] text-slate-450 mt-4 font-mono text-center leading-relaxed">
                        ⚠️ Security warning: rotates token tags in sync with system clock cycle.
                      </div>

                      <div className="text-sm font-bold text-slate-200 mt-4 leading-none font-mono">
                        SCAN CODE WITH PHONE
                      </div>

                    </div>
                  ) : (
                    <div className="py-24 text-center text-xs text-slate-405 font-mono">
                      <QrCode className="h-12 w-12 text-slate-655 text-slate-600 mx-auto mb-3" />
                      Select study target stream coordinates in options box to generate active lecture hall QR beacon.
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}


          {/* 5B. TAB STUDENT WORKFLOW: SMART MOBILE PHONE SIMULATOR SCANNER WITH GPS MOCKS */}
          {activeTab === 'self_scan' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h1 className="text-2xl font-bold bg-linear-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">Digital Student QR Check-In Scanner</h1>
                  <p className="text-sm text-slate-400">Use your camera scanner or sim interface coordinates to register presence marks instantly.</p>
                </div>
              </div>

              {/* Checkin simulator grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Mobile interface scanner mock parameters */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-5 relative overflow-hidden">
                  <div className="absolute right-4 top-4 text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest leading-none bg-emerald-500/10 px-2.5 py-1.5 rounded-sm border border-emerald-500/20">
                    📱 CAMERA ACTIVE
                  </div>

                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-200">
                    Handheld Mobile Interface simulator
                  </h3>

                  <div className="space-y-4">
                    
                    <div>
                      <label className="block text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
                        My Classroom QR Signal Target
                      </label>
                      <select 
                        value={scannedClassId}
                        onChange={(e) => setScannedClassId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-805 text-xs text-white p-2.5 rounded-lg focus:outline-hidden"
                        id="sim_camera_signal"
                      >
                        <option value="">-- Choose classroom --</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.class_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
                        Applicable Lecture Subject
                      </label>
                      <select 
                        value={scannedSubjectId}
                        onChange={(e) => setScannedSubjectId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-805 text-xs text-white p-2.5 rounded-lg focus:outline-hidden focus:border-indigo-505"
                      >
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.subject_code} - {s.subject_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* GPS Coordinates indicators */}
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-rose-400 animate-bounce" />
                        My Cellular GPS Coordinate Bounds
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 space-y-1">
                        <div>Latitude: <span className="text-slate-200 font-bold">{currentGps.lat.toFixed(5)} N</span></div>
                        <div>Longitude: <span className="text-slate-200 font-bold">{currentGps.lng.toFixed(5)} W</span></div>
                        <div className="text-slate-500 text-[10px]">Mock boundaries: Central Academy Campus Turing Lab Hall</div>
                      </div>
                    </div>

                    <button 
                      id="trigger_simulate_scan_btn"
                      onClick={executeSimulationQrCheckin}
                      className="w-full py-3 bg-linear-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-black tracking-wide text-xs uppercase shadow-md transition active:scale-97 rounded-xl flex items-center justify-center gap-2"
                    >
                      <QrCode className="h-4.5 w-4.5" />
                      Simulate Scanner Recognition Now
                    </button>

                  </div>
                </div>

                {/* Simulation Output and tracking log status */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-200">
                    Scanner Console Out & Historic checklist
                  </h3>

                  {simulatedScanOutput && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-mono text-emerald-450 text-emerald-400 space-y-1.5">
                      <div className="font-bold">✓ HANDHELD DECODER CONFIRMED</div>
                      <p>{simulatedScanOutput}</p>
                    </div>
                  )}

                  {simulatationError && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs font-mono text-rose-450 text-rose-400 space-y-1.5">
                      <div className="font-bold">⚠️ DECODER REJECTED EXCEPTION</div>
                      <p>{simulatationError}</p>
                    </div>
                  )}

                  {!simulatedScanOutput && !simulatationError && (
                    <div className="py-12 text-center text-xs text-slate-505 font-mono">
                      Awaiting digital decoder scanning simulation triggers...
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-850 space-y-2.5">
                    <h4 className="text-[11px] uppercase tracking-wider font-semibold font-mono text-slate-400">
                      My Historic Verified Presence Marks %
                    </h4>

                    <div className="space-y-2">
                      {myStudentCourseAttendance.slice(0, 5).map((att) => (
                        <div key={att.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-200">{att.subject_code}</span>
                            <span className="text-slate-500 text-[10px] ml-2">{att.attendance_date}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-sm font-mono text-[9px] font-bold ${
                            att.status === 'Present' || att.status === 'Late'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {att.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}


          {/* 6. VIEW TAB: ACADEMIC REPORTS TIMETABLE SPREADSHEETS EXPORT */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Academic Reports & Spreadsheets</h1>
                  <p className="text-sm text-slate-400">Filter full classroom attendance history databases and download secure CSV logs.</p>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 grid grid-cols-1 md:grid-cols-3 gap-4 border-slate-800">
                
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-455 text-slate-400 mb-1.5">Classroom Stream</label>
                  <select 
                    value={reportClassId}
                    onChange={(e) => setReportClassId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-hidden"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.class_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-455 text-slate-400 mb-1.5">Subject Filter Selector</label>
                  <select 
                    value={reportSubjectId}
                    onChange={(e) => setReportSubjectId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-hidden"
                  >
                    <option value="">-- All subjects --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.subject_code} - {s.subject_name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button 
                    id="download_report_btn"
                    onClick={triggerSpreadsheetDownload}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-extrabold text-slate-900 bg-emerald-400 hover:bg-emerald-355 hover:bg-emerald-500 shadow-sm transition active:scale-98"
                  >
                    <Download className="h-4.5 w-4.5 shrink-0" />
                    Download Academic CSV Spreadsheet
                  </button>
                </div>

              </div>

              {/* Generated Sheet Preview list */}
              <div className="bg-slate-950 rounded-xl border border-slate-850 overflow-hidden border-slate-800">
                <div className="p-4 bg-slate-900/70 border-b border-slate-850 px-6 font-mono text-xs text-indigo-400 font-bold uppercase">
                  Data preview table simulator
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-850">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-mono text-slate-400 tracking-wider">CODE</th>
                        <th className="px-6 py-3 text-left text-xs font-mono text-slate-400 tracking-wider">FULL NAME NAME</th>
                        <th className="px-6 py-3 text-center text-xs font-mono text-slate-400 tracking-wider">TOTAL SESSIONS</th>
                        <th className="px-6 py-3 text-center text-xs font-mono text-slate-400 tracking-wider">PRESENT</th>
                        <th className="px-6 py-3 text-center text-xs font-mono text-slate-400 tracking-wider">ABSENT</th>
                        <th className="px-6 py-3 text-center text-xs font-mono text-slate-400 tracking-wider">EXCUSED</th>
                        <th className="px-6 py-3 text-right text-xs font-mono text-slate-400 tracking-wider">PERCENTAGE RATE %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs text-slate-350">
                      {reporterRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-500 font-mono">
                            No active student rosters found for classroom index.
                          </td>
                        </tr>
                      ) : (
                        reporterRows.map((r, i) => {
                          const isWarning = r.percentage < 85;
                          return (
                            <tr key={i} className="hover:bg-slate-900/40 transition">
                              <td className="px-6 py-3 font-mono text-indigo-400 font-bold">{r.code}</td>
                              <td className="px-6 py-3 text-slate-200 font-bold">{r.name}</td>
                              <td className="px-6 py-3 text-center font-mono">{r.sessions}</td>
                              <td className="px-6 py-3 text-center font-mono text-emerald-400">{r.present}</td>
                              <td className="px-6 py-3 text-center font-mono text-rose-400">{r.absent}</td>
                              <td className="px-6 py-3 text-center font-mono text-indigo-400">{r.excused}</td>
                              <td className="px-6 py-3 text-right whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-sm font-bold font-mono ${
                                  isWarning ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-405 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {r.percentage}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          )}


          {/* 7. VIEW TAB: REAL-TIME SECURE SYSTEM AUDIT TRAIL LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Active Audit Log Trail</h1>
                  <p className="text-sm text-slate-400">Live feed trace logs of physical student registrations, logins, and API calls.</p>
                </div>
              </div>

              {/* Logger feed details */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 font-mono shadow-sm overflow-hidden text-xs">
                <div className="p-3.5 bg-slate-900 flex justify-between items-center text-slate-300 border-b border-slate-800 font-bold tracking-wider">
                  <span>SYSTEM KERNEL ACTION HISTORICAL LOGGER</span>
                  <span className="text-[10px] text-emerald-405 text-emerald-400 animate-pulse">● SECURE STREAM ENCRYPTED</span>
                </div>

                <div className="p-4 space-y-3 max-h-128 overflow-y-auto">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-lg flex flex-col md:flex-row gap-3 md:items-center justify-between transition border-slate-800">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                          <span className="text-indigo-400 font-extrabold">{log.action}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-300 font-bold">{log.user_name} ({log.user_role})</span>
                        </div>
                        <div className="text-slate-400 leading-relaxed text-[11px]">{log.description}</div>
                      </div>
                      <span className="text-[10px] text-slate-500">{log.user_email}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

    </div>
  );
}
