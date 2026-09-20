package com.sih.gem.service;

import com.sih.gem.entity.HelpdeskFAQ;
import com.sih.gem.entity.HelpdeskQuery;
import com.sih.gem.repository.HelpdeskFAQRepository;
import com.sih.gem.repository.HelpdeskQueryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HelpdeskService {

    private final HelpdeskFAQRepository faqRepository;
    private final HelpdeskQueryRepository queryRepository;

    public HelpdeskService(HelpdeskFAQRepository faqRepository,
                           HelpdeskQueryRepository queryRepository) {
        this.faqRepository = faqRepository;
        this.queryRepository = queryRepository;
    }

    public List<HelpdeskFAQ> getFAQs() {
        return faqRepository.findAll();
    }

    public HelpdeskQuery submitQuery(HelpdeskQuery query) {
        return queryRepository.save(query);
    }
}
