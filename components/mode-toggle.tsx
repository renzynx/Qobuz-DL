'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDownIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export const getHex = (themeValue: string, resolvedTheme: string | undefined): string => {
    if (themeValue === 'auto') {
        return resolvedTheme === 'light' ? '#000000' : '#FFFFFF';
    }

    return themes.find((theme) => theme.value.toLowerCase() === themeValue.toLowerCase())?.hex || '#FFFFFF';
};

export const themes = [
    {
        value: 'light',
        label: 'Light',
        hex: '#000000'
    },
    {
        value: 'dark',
        label: 'Dark',
        hex: '#FFFFFF'
    },
    {
        value: 'system',
        label: 'System',
        hex: 'auto'
    }
];

export function ModeToggle() {
    const { setTheme, theme } = useTheme();
    const [position, setPosition] = useState<string>(theme || 'dark');

    useEffect(() => {
        if (theme) {
            setPosition(theme);
        }
    }, [theme]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant='outline' className='flex gap-2 items-center'>
                    <p className='capitalize'>{position}</p>
                    <ChevronDownIcon />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start'>
                <DropdownMenuRadioGroup
                    value={position}
                    onValueChange={(position: string) => {
                        setPosition(position);
                        setTheme(position);
                    }}
                >
                    {themes.map((theme) => (
                        <DropdownMenuRadioItem key={theme.value} value={theme.value} className='capitalize'>
                            {theme.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
