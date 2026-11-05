using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Collections.Concurrent;

// Only middle-button presses are reported. Other mouse input is passed through.
internal static class MouseHook {
    private delegate IntPtr HookProc(int code, IntPtr message, IntPtr data);
    private static readonly HookProc Callback = OnMouse;
    private static readonly AutoResetEvent Clicked = new AutoResetEvent(false);
    private static IntPtr hook;
    private static uint threadId;
    private static int clickCount;
    private static bool pressed;
    private static bool outsideOnly;
    private static readonly ConcurrentQueue<Point> OutsideClicks = new ConcurrentQueue<Point>();
    private static volatile bool quitting;
    [StructLayout(LayoutKind.Sequential)] private struct Point { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] private struct Message { public IntPtr Window; public uint Id; public UIntPtr WParam; public IntPtr LParam; public uint Time; public Point Position; public uint Private; }
    [DllImport("user32.dll", SetLastError=true)] private static extern IntPtr SetWindowsHookEx(int id, HookProc callback, IntPtr module, uint thread);
    [DllImport("user32.dll")] private static extern bool UnhookWindowsHookEx(IntPtr handle);
    [DllImport("user32.dll")] private static extern IntPtr CallNextHookEx(IntPtr handle, int code, IntPtr message, IntPtr data);
    [DllImport("user32.dll")] private static extern int GetMessage(out Message message, IntPtr window, uint min, uint max);
    [DllImport("user32.dll")] private static extern bool PeekMessage(out Message message, IntPtr window, uint min, uint max, uint remove);
    [DllImport("user32.dll")] private static extern bool PostThreadMessage(uint thread, uint message, UIntPtr wParam, IntPtr lParam);
    [DllImport("kernel32.dll")] private static extern uint GetCurrentThreadId();
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] private static extern IntPtr GetModuleHandle(string module);
    private static IntPtr OnMouse(int code, IntPtr message, IntPtr data) {
        if (code >= 0) {
            int id = message.ToInt32();
            if (outsideOnly) {
                if (id == 0x0201 || id == 0x0204) {
                    OutsideClicks.Enqueue((Point)Marshal.PtrToStructure(data, typeof(Point)));
                    Clicked.Set();
                }
                return CallNextHookEx(hook, code, message, data);
            }
            if (id == 0x0207) {
                if (!pressed) { pressed = true; Interlocked.Increment(ref clickCount); Clicked.Set(); }
                return new IntPtr(1);
            }
            if (id == 0x0208 && pressed) { pressed = false; return new IntPtr(1); }
        }
        return CallNextHookEx(hook, code, message, data);
    }
    private static void Quit() { PostThreadMessage(threadId, 0x0012, UIntPtr.Zero, IntPtr.Zero); }
    private static int Main(string[] args) {
        outsideOnly = Array.IndexOf(args, "--outside") >= 0;
        threadId = GetCurrentThreadId();
        Message message;
        PeekMessage(out message, IntPtr.Zero, 0, 0, 0);
        hook = SetWindowsHookEx(14, Callback, GetModuleHandle(null), 0);
        if (hook == IntPtr.Zero) { Console.WriteLine("error:" + Marshal.GetLastWin32Error()); return 1; }
        Console.WriteLine("ready");
        Thread writer = new Thread(delegate() {
            try {
                while (!quitting) {
                    Clicked.WaitOne();
                    Point position;
                    while (OutsideClicks.TryDequeue(out position) && !quitting) Console.WriteLine("click:" + position.X + ":" + position.Y);
                    int count = Interlocked.Exchange(ref clickCount, 0);
                    while (count-- > 0 && !quitting) Console.WriteLine("middle");
                }
            } catch { Quit(); }
        });
        writer.IsBackground = true; writer.Start();
        Thread parent = new Thread(delegate() { try { while (Console.ReadLine() != null) { Quit(); break; } } finally { Quit(); } });
        parent.IsBackground = true; parent.Start();
        try { while (GetMessage(out message, IntPtr.Zero, 0, 0) > 0) { } }
        finally { quitting = true; Clicked.Set(); UnhookWindowsHookEx(hook); }
        return 0;
    }
}
