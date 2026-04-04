import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "22rem";
const SIDEBAR_WIDTH_COLLAPSED = "5rem";

const SidebarContext = React.createContext(null);

function useSidebar() {
    const context = React.useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider.");
    }
    return context;
}

function SidebarProvider({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }) {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);

    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;
    const setOpen = React.useCallback((value) => {
        const openState = typeof value === "function" ? value(open) : value;
        if (setOpenProp) {
            setOpenProp(openState);
        } else {
            _setOpen(openState);
        }
    }, [setOpenProp, open]);

    const toggleSidebar = React.useCallback(() => {
        return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
    }, [isMobile, setOpen, setOpenMobile]);

    const state = open ? "expanded" : "collapsed";

    const contextValue = React.useMemo(() => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
    }), [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]);

    return (
        <SidebarContext.Provider value={contextValue}>
            <TooltipProvider delayDuration={0}>
                <div 
                    data-slot="sidebar-wrapper" 
                    style={{
                        "--sidebar-width": SIDEBAR_WIDTH,
                        "--sidebar-width-collapsed": SIDEBAR_WIDTH_COLLAPSED,
                        ...style,
                    }} 
                    className={cn("flex min-h-svh w-full", className)} 
                    {...props}
                >
                    {children}
                </div>
            </TooltipProvider>
        </SidebarContext.Provider>
    );
}

function Sidebar({ className, children, ...props }) {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (isMobile) {
        return (
            <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
                <SheetHeader className="sr-only">
                    <SheetTitle>Sidebar</SheetTitle>
                    <SheetDescription>Displays the mobile sidebar.</SheetDescription>
                </SheetHeader>
                <SheetContent 
                    data-sidebar="sidebar" 
                    data-slot="sidebar" 
                    className="w-(--sidebar-width) p-0 [&>button]:hidden" 
                    style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE }}
                    side="left"
                >
                    <div className="flex h-full w-full flex-col">{children}</div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <div 
            className={cn(
                "border-r flex h-full flex-col transition-all duration-200 ease-linear",
                state === "expanded" ? "w-(--sidebar-width)" : "w-(--sidebar-width-collapsed)",
                className
            )} 
            data-state={state}
            data-slot="sidebar"
            {...props}
        >
            {children}
        </div>
    );
}

function SidebarContent({ className, ...props }) {
    const { state } = useSidebar();
    
    return (
        <div 
            data-slot="sidebar-content" 
            data-sidebar="content" 
            className={cn(
                "flex min-h-0 flex-1 flex-col gap-2 overflow-auto",
                state === "collapsed" && "overflow-hidden",
                className
            )} 
            {...props}
        />
    );
}

function SidebarFooter({ className, ...props }) {
    return (
        <div 
            data-slot="sidebar-footer" 
            data-sidebar="footer" 
            className={cn("flex flex-col gap-2 p-2", className)} 
            {...props}
        />
    );
}

function SidebarGroup({ className, ...props }) {
    return (
        <div 
            data-slot="sidebar-group" 
            data-sidebar="group" 
            className={cn("relative flex w-full min-w-0 flex-col px-4", className)} 
            {...props}
        />
    );
}

function SidebarGroupLabel({ className, asChild = false, ...props }) {
    const Comp = asChild ? Slot : "div";
    const { state } = useSidebar();

    return (
        <Comp 
            data-slot="sidebar-group-label" 
            data-sidebar="group-label" 
            className={cn(
                "text-foreground/70 flex h-8 shrink-0 items-center px-2 text-[11px] font-medium transition-opacity duration-200 ease-linear [&>svg]:size-4 [&>svg]:shrink-0",
                state === "collapsed" ? "h-0 opacity-0 mt-4" : "mt-2",
                className
            )} 
            {...props}
        />
    );
}

function SidebarMenu({ className, ...props }) {
    return (
        <ul 
            data-slot="sidebar-menu" 
            data-sidebar="menu" 
            className={cn("flex w-full min-w-0 flex-col gap-1", className)} 
            {...props}
        />
    );
}

function SidebarMenuItem({ className, ...props }) {
    return (
        <li 
            data-slot="sidebar-menu-item" 
            data-sidebar="menu-item" 
            className={cn("group/menu-item relative", className)} 
            {...props}
        />
    );
}

function SidebarMenuButton({ asChild = false, isActive = false, tooltip, className, ...props }) {
    const Comp = asChild ? Slot : "button";
    const { isMobile, state } = useSidebar();

    const button = (
        <Comp 
            data-slot="sidebar-menu-button" 
            data-sidebar="menu-button" 
            data-active={isActive} 
            className={cn(
                "flex w-full items-center gap-4 overflow-hidden rounded-sm py-2 px-3.5 text-left text-sm transition-all hover:bg-[#f0f0f0] hover:text-accent-foreground focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
                "data-[active=true]:bg-[#F4F0FF] data-[active=true]:font-[400] data-[active=true]:text-[#8a05ff]",
                className
            )} 
            {...props}
        />
    );

    if (!tooltip) {
        return button;
    }

    if (typeof tooltip === "string") {
        tooltip = { children: tooltip };
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent 
                side="right" 
                align="center" 
                hidden={state !== "collapsed" || isMobile} 
                {...tooltip}
            />
        </Tooltip>
    );
}

function SidebarMenuSub({ className, ...props }) {
    const { state } = useSidebar();

    return (
        <ul 
            data-slot="sidebar-menu-sub" 
            data-sidebar="menu-sub" 
            className={cn(
                "border-l border-black/20 ml-5 flex min-w-0 translate-x-px flex-col gap-1 px-3 py-0.5",
                state === "collapsed" && "hidden",
                className
            )} 
            {...props}
        />
    );
}

function SidebarMenuSubItem({ className, ...props }) {
    return (
        <li 
            data-slot="sidebar-menu-sub-item" 
            data-sidebar="menu-sub-item" 
            className={cn("group/menu-sub-item relative", className)} 
            {...props}
        />
    );
}

function SidebarMenuSubButton({ asChild = false, isActive = false, className, ...props }) {
    const Comp = asChild ? Slot : "a";
    const { state } = useSidebar();

    return (
        <Comp 
            data-slot="sidebar-menu-sub-button" 
            data-sidebar="menu-sub-button" 
            data-active={isActive} 
            className={cn(
                "text-foreground hover:bg-[#f0f0f0] rounded-sm hover:text-accent-foreground active:bg-[#e7e7e7] active:text-accent-foreground flex h-8.5 min-w-0 -translate-x-px items-center gap-2 overflow-hidden px-4 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
                "data-[active=true]:bg-[#F4F0FF] data-[active=true]:text-[#8a05ff] text-sm",
                state === "collapsed" && "hidden",
                className
            )} 
            {...props}
        />
    );
}

function SidebarSeparator({ className, ...props }) {
    return (
        <Separator 
            data-slot="sidebar-separator" 
            data-sidebar="separator" 
            className={cn("mx-2 w-auto", className)} 
            {...props}
        />
    );
}

export {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarSeparator,
    useSidebar,
};