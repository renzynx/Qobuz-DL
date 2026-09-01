'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import ChangelogDialog from '@/components/ui/changelog-dialog';
import SettingsForm from '@/components/ui/settings-form';
import { FaGithub } from '@react-icons/all-files/fa/FaGithub';

/**
 * Settings, changelog and the repo link, portalled into the shell topbar so
 * they stop being a floating corner stack over the wordmark.
 */
const HeaderActions = () => {
    const [slot, setSlot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setSlot(document.getElementById('shell-header-actions'));
    }, []);

    if (!slot) return null;

    return createPortal(
        <div className='flex items-center gap-1'>
            <SettingsForm />
            <ChangelogDialog />
            <a href='https://github.com/d0nj/Qobuz-DL' target='_blank' rel='noopener noreferrer' aria-label='GitHub repository'>
                <Button variant='ghost' size='icon' aria-label='GitHub repository'>
                    <FaGithub />
                </Button>
            </a>
        </div>,
        slot
    );
};

export default HeaderActions;
